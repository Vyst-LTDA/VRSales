import os
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta
from loguru import logger
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.models.customer import Customer
from app.models.campaign import Campaign

# Importação condicional do Twilio
try:
    from twilio.rest import Client as TwilioClient
except ImportError:
    TwilioClient = None

class NotificationService:
    
    def __init__(self):
        # Carrega configurações de ambiente
        self.TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID")
        self.TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
        self.TWILIO_FROM = os.getenv("TWILIO_PHONE_NUMBER")
        
        self.MAIL_USERNAME = os.getenv("MAIL_USERNAME")
        self.MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
        self.MAIL_FROM = os.getenv("MAIL_FROM")
        self.MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
        self.MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")

    def _get_mail_config(self) -> ConnectionConfig:
        """ Gera a configuração do FastMail baseada no .env """
        return ConnectionConfig(
            MAIL_USERNAME=self.MAIL_USERNAME,
            MAIL_PASSWORD=self.MAIL_PASSWORD,
            MAIL_FROM=self.MAIL_FROM,
            MAIL_PORT=self.MAIL_PORT,
            MAIL_SERVER=self.MAIL_SERVER,
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
            TIMEOUT=30,
        )

    async def _get_target_customers(self, db: AsyncSession, campaign: Campaign) -> List[Customer]:
        """ Filtra os clientes com base na regra da campanha (Versão Async) """
        stmt = select(Customer).where(Customer.store_id == campaign.store_id)
        now = datetime.utcnow()

        if campaign.target_audience == "all_customers":
            # Sem filtro adicional
            pass
        elif campaign.target_audience == "inactive_30_days":
            limit_date = now - timedelta(days=30)
            stmt = stmt.where((Customer.last_seen < limit_date) | (Customer.last_seen == None))
        elif campaign.target_audience == "inactive_60_days":
            limit_date = now - timedelta(days=60)
            stmt = stmt.where((Customer.last_seen < limit_date) | (Customer.last_seen == None))
        elif campaign.target_audience == "top_10_spenders":
            stmt = stmt.order_by(Customer.total_spent.desc()).limit(10)
            
        result = await db.execute(stmt)
        return result.scalars().all()

    async def send_campaign(self, db: AsyncSession, campaign_id: int):
        """ Executa o envio da campanha de forma totalmente assíncrona """
        # 1. Busca a campanha
        result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
        campaign = result.scalars().first()
        
        if not campaign:
            return

        # Marca como enviando
        campaign.status = "sending"
        await db.commit() # Commit async

        customers = await self._get_target_customers(db, campaign)
        logger.info(f"Iniciando envio real da campanha '{campaign.name}' para {len(customers)} clientes.")

        success_count = 0
        
        # Configura clientes externos
        twilio_client = None
        if self.TWILIO_SID and self.TWILIO_TOKEN and TwilioClient:
            try:
                twilio_client = TwilioClient(self.TWILIO_SID, self.TWILIO_TOKEN)
            except Exception as e:
                logger.error(f"Falha ao iniciar Twilio: {e}")

        mail_config = None
        fast_mail = None
        if self.MAIL_USERNAME and self.MAIL_PASSWORD:
            try:
                mail_config = self._get_mail_config()
                fast_mail = FastMail(mail_config)
            except Exception as e:
                logger.error(f"Falha ao configurar E-mail: {e}")

        # Loop de envio
        for customer in customers:
            message_body = campaign.message.replace("{nome}", customer.full_name.split()[0])
            sent = False
            
            # TENTA SMS (Prioridade)
            if customer.phone_number and twilio_client:
                try:
                    # Formata número para padrão E.164 (ex: +5511999999999)
                    raw_num = ''.join(filter(str.isdigit, customer.phone_number))
                    if len(raw_num) >= 10:
                        to_number = f"+55{raw_num}" if not raw_num.startswith("55") else f"+{raw_num}"
                        
                        # Nota: A chamada do Twilio é síncrona, mas é rápida o suficiente para background tasks simples.
                        # Em produção massiva, rodaríamos isso em um executor.
                        twilio_client.messages.create(
                            body=message_body,
                            from_=self.TWILIO_FROM,
                            to=to_number
                        )
                        logger.info(f"SMS enviado para {to_number}")
                        sent = True
                except Exception as e:
                    logger.error(f"Erro Twilio para {customer.phone_number}: {e}")

            # TENTA E-MAIL
            if not sent and customer.email and fast_mail:
                try:
                    message = MessageSchema(
                        subject=f"Novidade: {campaign.name}",
                        recipients=[customer.email],
                        body=message_body,
                        subtype=MessageType.html
                    )
                    await fast_mail.send_message(message)
                    logger.info(f"E-mail enviado para {customer.email}")
                    sent = True
                except Exception as e:
                    logger.error(f"Erro FastMail para {customer.email}: {e}")

            if sent:
                success_count += 1

        # Finaliza
        campaign.status = "sent"
        campaign.sent_at = datetime.utcnow()
        await db.commit()
        logger.info(f"Campanha finalizada. Sucesso: {success_count}/{len(customers)}")

notification_service = NotificationService()