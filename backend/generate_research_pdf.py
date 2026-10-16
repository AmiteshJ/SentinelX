"""
SentinelX Academic Research Implementation Report Generator
Produces a perfectly paginated, 5-page publication-quality PDF report
documenting all research papers, theoretical models, and algorithmic standards
implemented across the SentinelX Autonomous SOC & EDR platform.
"""
import os
import sys
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and print 'Page X of Y' with running headers & footers."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        if self._pageNumber == 1:
            # Suppress header on the executive front page
            return

        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0F172A"))
        self.drawString(54, 752, "SENTINELX")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(108, 752, " |   Research Paper Foundations & Algorithmic Implementation Report")

        # Top hairline
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.6)
        self.line(54, 744, 558, 744)

        # Bottom hairline
        self.line(54, 42, 558, 42)
        self.setFont("Helvetica", 8)
        self.drawString(54, 30, "Major Project (4th Year B.Tech/BE CSE) - Technical Evaluation Report")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 30, page_str)
        self.restoreState()


def build_pdf(filename: str):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=50,
        bottomMargin=50,
    )

    styles = getSampleStyleSheet()

    # Custom Palettes
    c_primary = colors.HexColor("#0F172A")    # Deep Slate
    c_accent = colors.HexColor("#0284C7")     # Ocean Blue / Cyan
    c_emerald = colors.HexColor("#059669")    # Security Green
    c_dark = colors.HexColor("#1E293B")       # Dark Charcoal
    c_muted = colors.HexColor("#64748B")      # Secondary Slate
    c_bg_light = colors.HexColor("#F8FAFC")   # Light gray table fill
    c_border = colors.HexColor("#E2E8F0")     # Light border

    # Custom Typography Styles
    title_style = ParagraphStyle(
        "CoverTitle",
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=c_primary,
        spaceAfter=4,
    )

    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=c_accent,
        spaceAfter=10,
    )

    h1_style = ParagraphStyle(
        "Heading1_Custom",
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=c_primary,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "Heading2_Custom",
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14,
        textColor=c_accent,
        spaceBefore=6,
        spaceAfter=3,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "Body_Custom",
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=c_dark,
        spaceAfter=4,
    )

    body_bold = ParagraphStyle(
        "Body_Bold",
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=12,
        textColor=c_primary,
        spaceAfter=4,
    )

    bullet_style = ParagraphStyle(
        "Bullet_Custom",
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=c_dark,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3,
    )

    callout_style = ParagraphStyle(
        "Callout_Text",
        fontName="Helvetica",
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor("#0C4A6E"),
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.white,
    )

    table_cell_style = ParagraphStyle(
        "TableCell",
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=c_dark,
    )

    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10,
        textColor=c_primary,
    )

    code_style = ParagraphStyle(
        "CodeInline",
        fontName="Courier",
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#B91C1C"),
    )

    story = []

    # =========================================================================
    # PAGE 1: TITLE, EXECUTIVE SUMMARY & MASTER RESEARCH MATRIX
    # =========================================================================
    story.append(Paragraph("SENTINELX // AUTONOMOUS AI SOC &amp; EDR PLATFORM", subtitle_style))
    story.append(Paragraph("Academic Research Foundations &amp; Algorithmic Implementation Report", title_style))
    story.append(HRFlowable(width="100%", thickness=2, color=c_accent, spaceBefore=2, spaceAfter=8))

    meta_table_data = [
        [
            Paragraph("<b>Project Domain:</b> Cybersecurity, Graph Neural Networks (GNN) &amp; Zero-Day Detection", body_style),
            Paragraph(f"<b>Date:</b> {datetime.now().strftime('%B %Y')}", body_style),
        ],
        [
            Paragraph("<b>Focus:</b> Mapping Theoretical Academic Literature to Production Implementation", body_style),
            Paragraph("<b>Scope:</b> 4th Year B.Tech / BE Major Project", body_style),
        ]
    ]
    t_meta = Table(meta_table_data, colWidths=[360, 144])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 0.5, c_border),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 8))

    story.append(Paragraph("1. Master Research Paper &amp; Standards Implementation Matrix", h1_style))
    story.append(Paragraph(
        "SentinelX rejects synthetic placeholder metrics. The table below maps each peer-reviewed paper and formal cybersecurity standard directly to its mathematical foundation and exact codebase location:",
        body_style
    ))

    matrix_data = [
        [
            Paragraph("<b>Research Paper / Standard</b>", table_header_style),
            Paragraph("<b>Authors &amp; Venue</b>", table_header_style),
            Paragraph("<b>Theoretical Core Concept</b>", table_header_style),
            Paragraph("<b>Codebase Location in SentinelX</b>", table_header_style),
        ],
        [
            Paragraph("<b>1. GraphSAGE</b><br/>Inductive Representation Learning", table_cell_bold),
            Paragraph("Hamilton, Ying, Leskovec<br/><i>NeurIPS 2017</i>", table_cell_style),
            Paragraph("Inductive neighborhood aggregation over k-NN flow graphs for Zero-Day novel attack discovery.", table_cell_style),
            Paragraph("<code>ml/graphsage/model.py</code><br/><code>ml/graphsage/train.py</code>", code_style),
        ],
        [
            Paragraph("<b>2. CIC-IDS2017 / 2018</b><br/>Modern Attack Dataset &amp; Flow Metrics", table_cell_bold),
            Paragraph("Sharafaldin, Lashkari, Ghorbani<br/><i>ICISSP 2018</i>", table_cell_style),
            Paragraph("80+ bidirectional statistical flow features &amp; multi-family realistic attack profiles.", table_cell_style),
            Paragraph("<code>datasets/</code><br/><code>app/services/dataset_streamer.py</code>", code_style),
        ],
        [
            Paragraph("<b>3. Isolation Forest</b><br/>Streaming Anomaly Detection", table_cell_bold),
            Paragraph("Liu, Ting, Zhou<br/><i>IEEE ICDM 2008</i>", table_cell_style),
            Paragraph("Partitioning tree path lengths to isolate high-entropy outliers without labeled priors.", table_cell_style),
            Paragraph("<code>app/detection/</code><br/><code>app/services/knowledge_service.py</code>", code_style),
        ],
        [
            Paragraph("<b>4. RAG Framework</b><br/>Retrieval-Augmented Generation", table_cell_bold),
            Paragraph("Lewis et al.<br/><i>NeurIPS 2020</i>", table_cell_style),
            Paragraph("Grounded LLM security responses via non-parametric incident &amp; playbook retrieval.", table_cell_style),
            Paragraph("<code>app/services/ai_service.py</code><br/><code>app/services/knowledge_service.py</code>", code_style),
        ],
        [
            Paragraph("<b>5. ML Benchmarks</b><br/>RF, XGBoost, CNN, LSTM", table_cell_bold),
            Paragraph("Breiman (2001), Chen (2016)<br/><i>KDD &amp; ML Journals</i>", table_cell_style),
            Paragraph("Comparative evaluation under identical zero-day held-out class splits.", table_cell_style),
            Paragraph("<code>ml/random_forest/</code>, <code>ml/xgboost/</code><br/><code>ml/cnn/</code>, <code>ml/lstm/</code>", code_style),
        ],
        [
            Paragraph("<b>6. NIST SP 800-30 &amp; MITRE</b><br/>Risk &amp; Kill-Chain Graph", table_cell_bold),
            Paragraph("NIST Special Pub (2012)<br/>Strom et al. (MITRE 2018)", table_cell_style),
            Paragraph("Multi-hop alert correlation &amp; dynamic quantitative incident risk scoring (0-100).", table_cell_style),
            Paragraph("<code>app/risk/risk_engine.py</code><br/><code>components/graph/</code>", code_style),
        ],
        [
            Paragraph("<b>7. Sigma Standard</b><br/>Generic SIEM Rule Engine", table_cell_bold),
            Paragraph("Roth &amp; Patzke<br/><i>Sigma Standard (2017)</i>", table_cell_style),
            Paragraph("AST compilation of YAML rule trees matching high-velocity Redis stream events in &lt;1ms.", table_cell_style),
            Paragraph("<code>app/detection/rule_engine.py</code><br/><code>app/workers/event_worker.py</code>", code_style),
        ],
    ]

    t_matrix = Table(matrix_data, colWidths=[120, 105, 149, 130])
    t_matrix.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
    ]))
    story.append(t_matrix)

    # =========================================================================
    # PAGE 2: GRAPHSAGE DEEP DIVE (THE NOVELTY CENTERPIECE)
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("2. Deep Dive: GraphSAGE for Zero-Day Attack Discovery", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_accent, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "<b>Reference Paper:</b> Hamilton, W. L., Ying, R., &amp; Leskovec, J. (2017). <i>Inductive representation learning on large graphs.</i> "
        "Advances in Neural Information Processing Systems (NeurIPS 2017), pp. 1024-1034.",
        body_bold
    ))

    story.append(Paragraph("2.1 The Theoretical Cyber Problem: Why Standard ML Fails on Zero-Days", h2_style))
    story.append(Paragraph(
        "Standard machine learning models (Random Forest, XGBoost, Deep Neural Networks) assume that network traffic records "
        "are independent, identically distributed (i.i.d.) tabular vectors. In real-world enterprise environments, attackers "
        "exploit novel zero-day vulnerabilities whose payload signatures and packet size distributions have never been seen. "
        "Consequently, supervised classifiers fail because they only recognize the exact feature distributions present in their training set.",
        body_style
    ))
    story.append(Paragraph(
        "However, cyber attacks cannot escape <b>graph topological constraints</b>. Whether an exploit is known or zero-day, "
        "the adversary must perform network reconnaissance, establish command-and-control (C2) beaconing, sweep subnets, or execute lateral movement. "
        "These behaviors form distinct, identifiable relational patterns across the communication topology.",
        body_style
    ))

    story.append(Paragraph("2.2 Mathematical Formulation &amp; Inductive Neighborhood Aggregation", h2_style))
    story.append(Paragraph(
        "Unlike transductive Graph Convolutional Networks (GCN) which require the full graph Laplacian matrix at train time and cannot generalize to unseen nodes, "
        "<b>GraphSAGE</b> learns parameterized aggregation functions that inductively generate embeddings for new, unobserved nodes. "
        "At step <i>k</i>, the node representation <i>h<sub>v</sub><sup>(k)</sup></i> is updated via:",
        body_style
    ))

    # Mathematical Callout Box
    math_box = [
        [
            Paragraph(
                "<b>GraphSAGE Neighborhood Aggregation Formulation:</b><br/>"
                "&nbsp;&nbsp;&nbsp;&nbsp;<b>h</b><sub>N(v)</sub><sup>(k)</sup> = AGGREGATE<sub>k</sub> ( { <b>h</b><sub>u</sub><sup>(k-1)</sup>, &forall; u &in; N(v) } )<br/>"
                "&nbsp;&nbsp;&nbsp;&nbsp;<b>h</b><sub>v</sub><sup>(k)</sup> = &sigma; ( <b>W</b><sup>(k)</sup> &middot; [ <b>h</b><sub>v</sub><sup>(k-1)</sup> || <b>h</b><sub>N(v)</sub><sup>(k)</sup> ] )<br/>"
                "where || represents vector concatenation, <b>W</b><sup>(k)</sup> is the trainable layer weight, &sigma; is the non-linear ReLU activation, "
                "and AGGREGATE is Mean Aggregation across the sampled neighborhood <i>N(v)</i>.",
                callout_style
            )
        ]
    ]
    t_math = Table(math_box, colWidths=[504])
    t_math.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#EFF6FF")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#93C5FD")),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_math)
    story.append(Spacer(1, 6))

    story.append(Paragraph("2.3 Concrete Implementation in SentinelX", h2_style))
    story.append(Paragraph(
        "• <b>Topological Graph Construction (<code>ml/graphsage/graph_construction.py</code>):</b> "
        "Transforms high-dimensional tabular flow vectors into a topological graph. In the default configuration, nodes represent individual IP endpoints "
        "or flow vectors, and edges are dynamically formed via <i>k-Nearest Neighbors (k-NN)</i> cosine similarity over scaled flow features. "
        "This links latent attack communications across endpoints.",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>PyTorch Geometric Neural Architecture (<code>ml/graphsage/model.py</code>):</b> "
        "Constructed using <code>torch_geometric.nn.SAGEConv</code> in a 2-layer inductive architecture: "
        "<br/>&nbsp;&nbsp;&nbsp;&nbsp;<i>Layer 1:</i> SAGEConv(in_channels=Flow Features, hidden_channels=32) &rarr; ReLU &rarr; Dropout(p=0.2)"
        "<br/>&nbsp;&nbsp;&nbsp;&nbsp;<i>Layer 2:</i> SAGEConv(hidden_channels=32, out_channels=2) &rarr; Softmax (Benign vs Malicious).",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>The Zero-Day Held-Out Class Protocol (<code>ml/preprocessing/pipeline.py::zero_day_split</code>):</b> "
        "To evaluate true zero-day performance, SentinelX completely strips an entire attack class "
        "(e.g., <i>PortScan</i>, <i>DoS Slowloris</i>, or <i>SQL Injection</i>) from the training set. "
        "The model is trained strictly on benign traffic and other attack types. At test time, the novel unseen attack is presented. "
        "GraphSAGE consistently outperforms classical models because neighbor aggregation reveals the structural anomaly of the exploit.",
        bullet_style
    ))

    # =========================================================================
    # PAGE 3: CIC-IDS DATASET & ISOLATION FOREST
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("3. CIC-IDS2017 &amp; CSE-CIC-IDS2018: Threat Telemetry &amp; Streaming", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_accent, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "<b>Reference Paper:</b> Sharafaldin, I., Lashkari, A. H., &amp; Ghorbani, A. A. (2018). "
        "<i>Toward generating a new intrusion detection dataset and analysis of malicious traffic.</i> "
        "Proceedings of the 4th International Conference on Information Systems Security and Privacy (ICISSP 2018), pp. 108-116.",
        body_bold
    ))
    story.append(Paragraph(
        "<b>Academic Significance:</b> Created by the Canadian Institute for Cybersecurity (University of New Brunswick), "
        "CIC-IDS2017 resolves the critical weaknesses of legacy datasets (KDD99, DARPA98) which lacked modern protocol diversity, "
        "encrypted traffic, and contemporary attack vectors. CIC-IDS captures 7 complete attack families across 80+ statistical flow metrics.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Implementation in SentinelX:</b>",
        body_bold
    ))
    story.append(Paragraph(
        "• <b>Feature Normalization (<code>backend/app/services/dataset_service.py</code>):</b> "
        "Normalizes 80+ bidirectional flow metrics: Flow Duration, Flow IAT Mean/Std, Fwd/Bwd Packet Lengths, "
        "Flag counts (PSH, ACK, FIN, URG, SYN), Window Sizes, and Subflow metrics.",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>Real-Time Redis Streamer (<code>backend/app/services/dataset_streamer.py</code>):</b> "
        "Replays packets into Redis Streams (<code>sentinelx:events</code>) at configurable rates (1-100 EPS) with smart offset skipping "
        "to eliminate benign delays, allowing live detection demonstration of PortScan, DoS, SQLi, and Brute Force attacks.",
        bullet_style
    ))

    story.append(Spacer(1, 10))
    story.append(Paragraph("4. Isolation Forest for Streaming Anomaly Detection", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_accent, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "<b>Reference Paper:</b> Liu, F. T., Ting, K. M., &amp; Zhou, Z. H. (2008). <i>Isolation Forest.</i> "
        "Eighth IEEE International Conference on Data Mining (ICDM 2008), pp. 413-422. IEEE.",
        body_bold
    ))
    story.append(Paragraph(
        "<b>Algorithmic Rationale:</b> Unlike density estimation (LOF) or distance-based clustering (DBSCAN) which require O(n²) comparisons, "
        "Isolation Forest isolates outliers by building an ensemble of completely random binary trees (<i>iTrees</i>). "
        "Because anomalies have distinct attribute values, they are isolated at significantly shallower tree depths (shorter path lengths <i>h(x)</i>).",
        body_style
    ))

    # Anomaly formula box
    if_box = [
        [
            Paragraph(
                "<b>Isolation Forest Anomaly Scoring Formula:</b><br/>"
                "&nbsp;&nbsp;&nbsp;&nbsp;<i>s(x, n) = 2<sup> - E(h(x)) / c(n) </sup></i><br/>"
                "where <i>E(h(x))</i> is the average path length across the tree ensemble, and <i>c(n) = 2 ln(n - 1) + 0.5772156649 - 2(n - 1)/n</i> "
                "is the average path length of an unsuccessful binary search tree.<br/>"
                "Scores close to 1 indicate confirmed anomalies; scores &lt; 0.5 indicate normal traffic.",
                callout_style
            )
        ]
    ]
    t_if = Table(if_box, colWidths=[504])
    t_if.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F0FDF4")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#86EFAC")),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_if)
    story.append(Spacer(1, 6))

    story.append(Paragraph(
        "<b>SentinelX Implementation (<code>backend/app/detection/</code>):</b> "
        "Isolation Forest acts as SentinelX's unsupervised frontline defense. Any high-entropy packet burst or evasion attempt "
        "that avoids static signature rules triggers an anomaly score <i>s &ge; 0.65</i>, escalating the event directly into the SOC "
        "incident graph for automated investigation.",
        body_style
    ))

    # =========================================================================
    # PAGE 4: RAG, NIST RISK SCORING & SIGMA ENGINE
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("5. Retrieval-Augmented Generation (RAG) for SOC Operations", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_accent, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "<b>Reference Paper:</b> Lewis, P., Perez, E., Piktus, A., et al. (2020). "
        "<i>Retrieval-augmented generation for knowledge-intensive NLP tasks.</i> "
        "Advances in Neural Information Processing Systems (NeurIPS 2020), 33, 9459-9474.",
        body_bold
    ))
    story.append(Paragraph(
        "<b>The Problem in Autonomous SOCs:</b> Generative AI assistants in cybersecurity frequently suffer from catastrophic hallucination, "
        "inventing non-existent IP addresses, referencing inaccurate CVEs, or suggesting dangerous firewall configurations.",
        body_style
    ))
    story.append(Paragraph(
        "<b>SentinelX Implementation (<code>backend/app/services/ai_service.py</code>):</b> "
        "SentinelX strictly implements RAG by coupling parametric LLM capability with non-parametric document and telemetry retrieval: "
        "<br/>1. <b>Real-time Telemetry Ingestion:</b> Live incident reports, attacker IPs, affected hostnames, and rule matches are indexed into memory. "
        "<br/>2. <b>MITRE ATT&CK &amp; Playbook Grounding:</b> Enterprise mitigation strategies and firewall containment playbooks are dynamically retrieved. "
        "<br/>3. <b>Enforced Grounding Constraint:</b> The AI Copilot is instructed to formulate remediation responses exclusively using retrieved facts.",
        body_style
    ))

    story.append(Spacer(1, 10))
    story.append(Paragraph("6. Standards: NIST SP 800-30 &amp; Sigma Rule AST Engine", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_accent, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph("6.1 NIST SP 800-30 Quantitative Incident Risk Scoring (<code>backend/app/risk/risk_engine.py</code>)", h2_style))
    story.append(Paragraph(
        "Following the risk assessment guidelines in <i>NIST Special Publication 800-30 Revision 1</i>, SentinelX replaces static severity tags "
        "with dynamic quantitative risk scores ranging from 0 to 100:",
        body_style
    ))

    risk_box = [
        [
            Paragraph(
                "<b>SentinelX Quantitative Risk Calculation:</b><br/>"
                "&nbsp;&nbsp;&nbsp;&nbsp;<b>RiskScore</b> = min(100, max(0, BaseSeverityWeight + min(AlertCount &times; 5, 25) + MITRE_Bonus))<br/>"
                "where BaseSeverity &isin; {Critical: 50, High: 35, Medium: 20, Low: 10}, "
                "multi-event aggregation scales with incident frequency, and confirmed MITRE technique mapping awards +15 points.",
                callout_style
            )
        ]
    ]
    t_risk = Table(risk_box, colWidths=[504])
    t_risk.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FDF2F8")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#F472B6")),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_risk)
    story.append(Spacer(1, 6))

    story.append(Paragraph("6.2 Sigma Generic SIEM Signature AST Engine (<code>backend/app/detection/rule_engine.py</code>)", h2_style))
    story.append(Paragraph(
        "Based on the open standard by Florian Roth and Thomas Patzke, SentinelX compiles YAML-based Sigma rules into an optimized "
        "Abstract Syntax Tree (AST) in Python. The background event worker evaluates incoming Redis Stream events against the rule AST "
        "in sub-millisecond execution time, instantly flagging port scans, remote exposure, and credential access.",
        body_style
    ))

    # =========================================================================
    # PAGE 5: COMPLETE ARCHITECTURE & FORMAL BIBLIOGRAPHY
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("7. End-to-End Architectural Integration", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_accent, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "All academic research components operate in a unified, multi-tiered pipeline inside SentinelX:",
        body_style
    ))

    arch_table_data = [
        [
            Paragraph("<b>Architecture Layer</b>", table_header_style),
            Paragraph("<b>Academic Component</b>", table_header_style),
            Paragraph("<b>Production Function in SentinelX</b>", table_header_style),
        ],
        [
            Paragraph("<b>1. Telemetry Ingestion</b>", table_cell_bold),
            Paragraph("CIC-IDS2017 &amp; psutil Sockets", table_cell_style),
            Paragraph("Dual-mode ingestion: live host connections (mode='LIVE') and dataset replay (mode='DATASET').", table_cell_style),
        ],
        [
            Paragraph("<b>2. Stream Broker</b>", table_cell_bold),
            Paragraph("Redis Streams (XADD / XREADGROUP)", table_cell_style),
            Paragraph("Persistent, decoupled streaming broker with auto-flush on mode switches.", table_cell_style),
        ],
        [
            Paragraph("<b>3. Detection Worker</b>", table_cell_bold),
            Paragraph("Sigma AST &amp; Isolation Forest", table_cell_style),
            Paragraph("Evaluates stream events in sub-millisecond time; flags known rules and high-entropy anomalies.", table_cell_style),
        ],
        [
            Paragraph("<b>4. Incident Correlation</b>", table_cell_bold),
            Paragraph("NIST SP 800-30 &amp; MITRE Graph", table_cell_style),
            Paragraph("Correlates isolated alerts by IP into cohesive attack kill-chains with 0-100 dynamic risk scores.", table_cell_style),
        ],
        [
            Paragraph("<b>5. Zero-Day GNN</b>", table_cell_bold),
            Paragraph("GraphSAGE (PyTorch Geometric)", table_cell_style),
            Paragraph("Inductive neighbor aggregation detecting unclassified, completely held-out attack vectors.", table_cell_style),
        ],
        [
            Paragraph("<b>6. Copilot &amp; Intelligence</b>", table_cell_bold),
            Paragraph("RAG (Retrieval-Augmented Gen)", table_cell_style),
            Paragraph("Grounds AI response strictly in real retrieved incident telemetry and containment playbooks.", table_cell_style),
        ],
        [
            Paragraph("<b>7. Endpoint SOAR</b>", table_cell_bold),
            Paragraph("Automated Incident Response", table_cell_style),
            Paragraph("Dispatches remote containment commands (Windows Firewall IP block, taskkill) back to the agent.", table_cell_style),
        ],
    ]

    t_arch = Table(arch_table_data, colWidths=[110, 144, 250])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_bg_light]),
    ]))
    story.append(t_arch)
    story.append(Spacer(1, 10))

    story.append(Paragraph("8. Formal Academic Bibliography &amp; References", h1_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_accent, spaceBefore=2, spaceAfter=8))

    references = [
        "<b>[1] Hamilton, W. L., Ying, R., &amp; Leskovec, J. (2017).</b> Inductive representation learning on large graphs. <i>Advances in Neural Information Processing Systems (NeurIPS 2017)</i>, 30, 1024-1034.",
        "<b>[2] Sharafaldin, I., Lashkari, A. H., &amp; Ghorbani, A. A. (2018).</b> Toward generating a new intrusion detection dataset and analysis of malicious traffic. <i>Proceedings of the 4th International Conference on Information Systems Security and Privacy (ICISSP 2018)</i>, pp. 108-116.",
        "<b>[3] Liu, F. T., Ting, K. M., &amp; Zhou, Z. H. (2008).</b> Isolation Forest. <i>Eighth IEEE International Conference on Data Mining (ICDM 2008)</i>, pp. 413-422. IEEE.",
        "<b>[4] Lewis, P., Perez, E., Piktus, A., et al. (2020).</b> Retrieval-augmented generation for knowledge-intensive NLP tasks. <i>Advances in Neural Information Processing Systems (NeurIPS 2020)</i>, 33, 9459-9474.",
        "<b>[5] Chen, T., &amp; Guestrin, C. (2016).</b> XGBoost: A scalable tree boosting system. <i>Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining</i>, pp. 785-794.",
        "<b>[6] Breiman, L. (2001).</b> Random Forests. <i>Machine Learning</i>, 45(1), 5-32.",
        "<b>[7] National Institute of Standards and Technology (NIST) (2012).</b> Guide for Conducting Risk Assessments. <i>NIST Special Publication 800-30 Revision 1</i>, U.S. Department of Commerce.",
        "<b>[8] Strom, B. E., Applebaum, A., Miller, D. P., et al. (2018).</b> MITRE ATT&CK: Design and Philosophy. <i>Technical Report MTR180126</i>, The MITRE Corporation.",
        "<b>[9] Roth, F., &amp; Patzke, T. (2017).</b> Sigma: Generic Signature Format for SIEM Systems. <i>Sigma Project Specification</i>.",
    ]

    for ref in references:
        story.append(Paragraph(ref, bullet_style))

    # Build document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated 5-page publication-grade PDF: {filename}")


if __name__ == "__main__":
    output_pdf = sys.argv[1] if len(sys.argv) > 1 else "SentinelX_Research_Paper_Implementations.pdf"
    build_pdf(output_pdf)
