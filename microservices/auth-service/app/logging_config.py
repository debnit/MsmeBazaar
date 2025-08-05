import logging
import sys
from loguru import logger

def configure_logging():
    """
    Configures global structured logging for the Auth Service.
    Replaces the default logging with Loguru, supports JSON logs in production.
    """
    # Remove default Loguru handlers to avoid duplicates
    logger.remove()

    # Set log format
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "<level>{message}</level>"
    )

    # Output to stdout
    logger.add(sys.stdout, format=log_format, level="INFO", enqueue=True, backtrace=True, diagnose=True)

    # Redirect standard logging to Loguru
    class InterceptHandler(logging.Handler):
        def emit(self, record):
            # Get corresponding Loguru level
            try:
                level = logger.level(record.levelname).name
            except ValueError:
                level = record.levelno
            # Find caller from where logging was called
            frame, depth = logging.currentframe(), 2
            while frame.f_code.co_filename == logging.__file__:
                frame = frame.f_back
                depth += 1
            logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())

    logging.basicConfig(handlers=[InterceptHandler()], level=logging.INFO, force=True)

    # Silence noisy loggers if needed
    logging.getLogger("uvicorn.access").handlers.clear()
    logging.getLogger("uvicorn.error").handlers.clear()

    logger.info("✅ Logging configured successfully")
