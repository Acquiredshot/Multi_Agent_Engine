"""LangGraph-backed orchestration for compliance and anomaly checks."""

from __future__ import annotations

import re
from typing import Any, TypedDict

from app.models import AnomalyResult, ComplianceFinding, ComplianceResult, DocumentRequest, OCRResult

try:  # pragma: no cover - optional dependency for production deployments.
    from langgraph.graph import END, START, StateGraph
except ImportError:  # pragma: no cover
    StateGraph = None  # type: ignore[assignment]
    END = START = None  # type: ignore[assignment]


def _normalise_text(value: str | None) -> str:
    return (value or "").strip().lower()


def _rule_checks(text: str) -> list[tuple[str, str, str | None]]:
    checks: list[tuple[str, str, str | None]] = []
    normalized = _normalise_text(text)

    if re.search(r"(invoice|bill|receipt)", normalized):
        checks.append(("invoice_present", "low", "Invoice metadata was identified."))
    if re.search(r"(?:\btotal\b|\bamount\b|\bbalance\b).*\b\d+[,.]?\d*\b", normalized):
        checks.append(("amount_present", "low", "Document contains an amount total."))
    if re.search(r"(tax|vat|gst|sales tax)", normalized):
        checks.append(("tax_reference", "medium", "Tax language was detected."))
    if re.search(r"(urgent|immediate|emergency|same day)", normalized):
        checks.append(("urgency_flag", "high", "Unusual urgency language detected."))
    if re.search(r"(wire transfer|gift card|prepaid|cash app)", normalized):
        checks.append(("payment_risk", "high", "Payment method wording appears elevated risk."))

    return checks


class ComplianceState(TypedDict):
    document_id: str
    text: str
    findings: list[ComplianceFinding]
    rules_evaluated: int
    passed: bool


class AnomalyState(TypedDict):
    document_id: str
    text: str
    score: float
    reasons: list[str]
    is_anomalous: bool


def _run_compliance_plain(request: DocumentRequest, ocr: OCRResult | None = None) -> ComplianceResult:
    text = (ocr.text if ocr and ocr.text else "")
    findings: list[ComplianceFinding] = []
    rules_evaluated = 0

    for rule_id, severity, message in _rule_checks(text):
        rules_evaluated += 1
        findings.append(
            ComplianceFinding(
                rule_id=rule_id,
                severity=severity,
                message=message,
            )
        )

    return ComplianceResult(
        document_id=request.document_id,
        passed=not any(item.severity in {"high", "critical"} for item in findings),
        findings=findings,
        rules_evaluated=rules_evaluated,
    )


def _run_anomaly_plain(request: DocumentRequest, ocr: OCRResult | None = None) -> AnomalyResult:
    text = (ocr.text if ocr and ocr.text else "")
    score = 0.0
    reasons: list[str] = []
    normalized = _normalise_text(text)

    if re.search(r"(urgent|immediate|emergency|same day)", normalized):
        score += 0.25
        reasons.append("Urgent wording suggests a rush request.")
    if re.search(r"(?:\b\d{5,}\b)", normalized):
        score += 0.2
        reasons.append("Large monetary or numeric outlier detected.")
    if re.search(r"(wire transfer|gift card|cash app|prepaid)", normalized):
        score += 0.25
        reasons.append("Nonstandard payment instruction detected.")
    if re.search(r"(tax\s*0|vat\s*0|gst\s*0|zero tax)", normalized):
        score += 0.15
        reasons.append("Tax field looks inconsistent or missing.")
    if re.search(r"(amount\s*\d+[,.]?\d{3,}|\$\s?\d{4,})", normalized):
        score += 0.15
        reasons.append("High-value amount is above the usual range.")

    score = min(score, 1.0)
    is_anomalous = score >= 0.5 or bool(reasons)
    return AnomalyResult(
        document_id=request.document_id,
        anomaly_score=round(score, 4),
        is_anomalous=is_anomalous,
        reasons=reasons,
    )


def run_compliance_agent(request: DocumentRequest, ocr: OCRResult | None = None) -> ComplianceResult:
    """Run the compliance workflow as a LangGraph when available."""
    if StateGraph is None or END is None or START is None:
        return _run_compliance_plain(request, ocr)

    def _inspect_document(state: ComplianceState) -> ComplianceState:
        state["text"] = state["text"] or (ocr.text if ocr else "")
        return state

    def _evaluate_rules(state: ComplianceState) -> ComplianceState:
        findings: list[ComplianceFinding] = []
        for rule_id, severity, message in _rule_checks(state["text"]):
            findings.append(ComplianceFinding(rule_id=rule_id, severity=severity, message=message))
        state["findings"] = findings
        state["rules_evaluated"] = len(findings)
        state["passed"] = not any(item.severity in {"high", "critical"} for item in findings)
        return state

    builder = StateGraph(ComplianceState)
    builder.add_node("inspect_document", _inspect_document)
    builder.add_node("evaluate_rules", _evaluate_rules)
    builder.add_edge(START, "inspect_document")
    builder.add_edge("inspect_document", "evaluate_rules")
    builder.add_edge("evaluate_rules", END)

    graph = builder.compile()
    state: ComplianceState = {
        "document_id": request.document_id,
        "text": (ocr.text if ocr else ""),
        "findings": [],
        "rules_evaluated": 0,
        "passed": True,
    }
    result_state = graph.invoke(state)
    return ComplianceResult(
        document_id=request.document_id,
        passed=result_state["passed"],
        findings=result_state["findings"],
        rules_evaluated=result_state["rules_evaluated"],
    )


def run_anomaly_agent(request: DocumentRequest, ocr: OCRResult | None = None) -> AnomalyResult:
    """Run the anomaly workflow as a LangGraph when available."""
    if StateGraph is None or END is None or START is None:
        return _run_anomaly_plain(request, ocr)

    def _inspect_document(state: AnomalyState) -> AnomalyState:
        state["text"] = state["text"] or (ocr.text if ocr else "")
        return state

    def _score_document(state: AnomalyState) -> AnomalyState:
        normalized = _normalise_text(state["text"])
        score = 0.0
        reasons: list[str] = []
        if re.search(r"(urgent|immediate|emergency|same day)", normalized):
            score += 0.25
            reasons.append("Urgent wording suggests a rush request.")
        if re.search(r"(?:\b\d{5,}\b)", normalized):
            score += 0.2
            reasons.append("Large monetary or numeric outlier detected.")
        if re.search(r"(wire transfer|gift card|cash app|prepaid)", normalized):
            score += 0.25
            reasons.append("Nonstandard payment instruction detected.")
        if re.search(r"(tax\s*0|vat\s*0|gst\s*0|zero tax)", normalized):
            score += 0.15
            reasons.append("Tax field looks inconsistent or missing.")
        if re.search(r"(amount\s*\d+[,.]?\d{3,}|\$\s?\d{4,})", normalized):
            score += 0.15
            reasons.append("High-value amount is above the usual range.")
        state["score"] = min(score, 1.0)
        state["reasons"] = reasons
        state["is_anomalous"] = state["score"] >= 0.5 or bool(reasons)
        return state

    builder = StateGraph(AnomalyState)
    builder.add_node("inspect_document", _inspect_document)
    builder.add_node("score_document", _score_document)
    builder.add_edge(START, "inspect_document")
    builder.add_edge("inspect_document", "score_document")
    builder.add_edge("score_document", END)

    graph = builder.compile()
    state: AnomalyState = {
        "document_id": request.document_id,
        "text": (ocr.text if ocr else ""),
        "score": 0.0,
        "reasons": [],
        "is_anomalous": False,
    }
    result_state = graph.invoke(state)
    return AnomalyResult(
        document_id=request.document_id,
        anomaly_score=round(result_state["score"], 4),
        is_anomalous=result_state["is_anomalous"],
        reasons=result_state["reasons"],
    )


__all__ = [
    "run_compliance_agent",
    "run_anomaly_agent",
]
