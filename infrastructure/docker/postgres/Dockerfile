# Simple PostgreSQL Dockerfile for Railway
FROM postgres:15-alpine

# Set environment variables
ENV POSTGRES_DB=msmebazaar
ENV POSTGRES_USER=postgres

# Copy any initialization scripts if they exist
COPY ../../database/*.sql /docker-entrypoint-initdb.d/

# Expose PostgreSQL port
EXPOSE 5432

# Use the default PostgreSQL entrypoint
CMD ["postgres"]