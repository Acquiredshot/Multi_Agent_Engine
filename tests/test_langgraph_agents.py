from app.config import Settings
from app.models import AnomalyResult, ComplianceResult, DocumentRequest, OCRResult
from app.tasks.anomaly import run_anomaly_agent
from app.tasks.compliance import run_compliance_agent


def test_default_broker_uses_rabbitmq():
    settings = Settings()
    assert settings.broker_url.startswith("amqp://")
    assert settings.result_backend_url.startswith("redis://")


def test_compliance_agent_returns_real_findings():
    request = DocumentRequest(
        document_id="INV-42",
        source_uri="file:///tmp/invoice.pdf",
    )
    ocr = OCRResult(
        document_id="INV-42",
        page_count=1,
        text="Invoice 42\nVendor: Contoso\nTotal due: 1500\nCustomer: Northwind",
    )

    result = run_compliance_agent(request, ocr)

    assert isinstance(result, ComplianceResult)
    assert result.document_id == "INV-42"
    assert result.rules_evaluated >= 1
    assert result.passed is True


def test_anomaly_agent_returns_score_and_reasons():
    request = DocumentRequest(
        document_id="INV-42",
        source_uri="file:///tmp/invoice.pdf",
    )
    ocr = OCRResult(
        document_id="INV-42",
        page_count=1,
        text="Invoice 42\nAmount 999999\nTax 0\nCustomer: Northwind\nNote: emergency payment",
    )

    result = run_anomaly_agent(request, ocr)

    assert isinstance(result, AnomalyResult)
    assert result.document_id == "INV-42"
    assert result.anomaly_score >= 0.0
    assert result.reasons
