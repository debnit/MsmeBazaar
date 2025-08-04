import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

LOGS_DIR = Path(__file__).resolve().parent.parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)

LOG_FILE = LOGS_DIR / "auth-service.log"


def configure_logging(level: int = logging.INFO):
    """
    Configures logging for the Auth Service.
    Logs to both console and rotating log files.
    """
    # Clear any existing loggers
    logging.getLogger().handlers.clear()

    # Formatter for logs
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)

    # File handler (rotating logs up to 5MB, keep 3 backups)
    file_handler = RotatingFileHandler(
        LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3
    )
    file_handler.setFormatter(formatter)

    # Configure root logger
    logging.basicConfig(level=level, handlers=[console_handler, file_handler])

    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

    logging.info("✅ Logging configured successfully.")
