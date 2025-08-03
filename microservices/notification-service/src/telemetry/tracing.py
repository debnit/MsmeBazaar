from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
trace.set_tracer_provider(provider)

otlp_exporter = OTLPSpanExporter(endpoint="http://otel-collector:4318/v1/traces")
provider.add_span_processor(SimpleSpanProcessor(otlp_exporter))

tracer = trace.get_tracer("notification-service")
