from pathlib import Path
import shutil

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DOCS_DIR = ROOT_DIR / "public" / "docs"
OUT = ROOT_DIR

GREEN = "07563E"
PALE_GREEN = "EDF5F1"
PALE_GREY = "F7F7F7"
BORDER = "D9D9D9"
BLACK = RGBColor(0, 0, 0)


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_border(cell, color=BORDER):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = qn(f"w:{edge}")
        element = borders.find(tag)
        if element is None:
            element = OxmlElement(f"w:{edge}")
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), "6")
        element.set(qn("w:color"), color)


def set_cell_margins(cell, top=110, start=120, bottom=110, end=120):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for side, value in (("top", top), ("left", start), ("bottom", bottom), ("right", end)):
        node = tc_mar.find(qn(f"w:{side}"))
        if node is None:
            node = OxmlElement(f"w:{side}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def set_rtl(paragraph):
    p_pr = paragraph._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    bidi.set(qn("w:val"), "1")
    p_pr.append(bidi)


def set_run_font(run, font_name="Arial", size=11, bold=False, color=BLACK, rtl=False):
    run.font.name = font_name
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.append(rFonts)
    rFonts.set(qn("w:ascii"), font_name)
    rFonts.set(qn("w:hAnsi"), font_name)
    rFonts.set(qn("w:cs"), font_name)
    run.font.size = Pt(size)
    run.bold = bold
    run.font.color.rgb = color
    if rtl:
        rPr.append(OxmlElement("w:rtl"))


def prepare_document(title, subtitle, audience, arabic=False):
    doc = Document()
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.72)
    section.bottom_margin = Inches(0.72)
    section.left_margin = Inches(0.78)
    section.right_margin = Inches(0.78)

    normal = doc.styles["Normal"]
    normal.font.name = "Arial"
    normal_rPr = normal._element.get_or_add_rPr()
    normal_rFonts = normal_rPr.find(qn("w:rFonts"))
    if normal_rFonts is None:
        normal_rFonts = OxmlElement("w:rFonts")
        normal_rPr.append(normal_rFonts)
    normal_rFonts.set(qn("w:ascii"), "Arial")
    normal_rFonts.set(qn("w:hAnsi"), "Arial")
    normal_rFonts.set(qn("w:cs"), "Arial")
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = BLACK
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.16

    for style_name, size in (("Title", 23), ("Heading 1", 15), ("Heading 2", 12)):
        style = doc.styles[style_name]
        style.font.name = "Arial"
        style_rPr = style._element.get_or_add_rPr()
        style_rFonts = style_rPr.find(qn("w:rFonts"))
        if style_rFonts is None:
            style_rFonts = OxmlElement("w:rFonts")
            style_rPr.append(style_rFonts)
        style_rFonts.set(qn("w:ascii"), "Arial")
        style_rFonts.set(qn("w:hAnsi"), "Arial")
        style_rFonts.set(qn("w:cs"), "Arial")
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = BLACK
        style.paragraph_format.space_before = Pt(13 if style_name != "Title" else 0)
        style.paragraph_format.space_after = Pt(6)

    title_p = doc.add_paragraph(style="Title")
    title_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if arabic else WD_ALIGN_PARAGRAPH.LEFT
    title_run = title_p.add_run(title)
    set_run_font(title_run, size=23, bold=True, rtl=arabic)
    if arabic:
        set_rtl(title_p)

    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if arabic else WD_ALIGN_PARAGRAPH.LEFT
    sub = sub_p.add_run(subtitle)
    set_run_font(sub, size=11, bold=False, color=RGBColor(70, 70, 70), rtl=arabic)
    if arabic:
        set_rtl(sub_p)

    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.RIGHT if arabic else WD_ALIGN_PARAGRAPH.LEFT
    r = meta.add_run(audience)
    set_run_font(r, size=9.5, bold=True, color=RGBColor(70, 70, 70), rtl=arabic)
    if arabic:
        set_rtl(meta)

    doc.add_paragraph()
    return doc


def add_heading(doc, text, level=1, arabic=False):
    p = doc.add_paragraph(style=f"Heading {level}")
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if arabic else WD_ALIGN_PARAGRAPH.LEFT
    r = p.add_run(text)
    set_run_font(r, size=15 if level == 1 else 12, bold=True, rtl=arabic)
    if arabic:
        set_rtl(p)
    return p


def add_para(doc, text, bold_lead=None, arabic=False):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if arabic else WD_ALIGN_PARAGRAPH.LEFT
    if bold_lead:
        r = p.add_run(bold_lead)
        set_run_font(r, bold=True, rtl=arabic)
    r = p.add_run(text)
    set_run_font(r, rtl=arabic)
    if arabic:
        set_rtl(p)
    return p


def add_bullets(doc, items, arabic=False):
    for item in items:
        p = doc.add_paragraph(style="List Bullet")
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if arabic else WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(item)
        set_run_font(r, rtl=arabic)
        if arabic:
            set_rtl(p)


def add_checklist(doc, items, arabic=False):
    for item in items:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.12 if not arabic else 0)
        p.paragraph_format.right_indent = Inches(0.12 if arabic else 0)
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if arabic else WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run("[ ] " + item)
        set_run_font(r, rtl=arabic)
        if arabic:
            set_rtl(p)


def add_table(doc, headers, rows, widths=None, arabic=False):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    table.autofit = False
    header_cells = table.rows[0].cells
    set_repeat_table_header(table.rows[0])
    for i, header in enumerate(headers):
        cell = header_cells[i]
        if widths:
            cell.width = Inches(widths[i])
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        set_cell_shading(cell, GREEN)
        set_cell_border(cell)
        set_cell_margins(cell)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if arabic else WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(header)
        set_run_font(r, size=9.2, bold=True, color=RGBColor(255, 255, 255), rtl=arabic)
        if arabic:
            set_rtl(p)
    for row_index, row_data in enumerate(rows):
        cells = table.add_row().cells
        for i, value in enumerate(row_data):
            cell = cells[i]
            if widths:
                cell.width = Inches(widths[i])
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_border(cell)
            set_cell_margins(cell)
            if row_index % 2 == 1:
                set_cell_shading(cell, PALE_GREY)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if arabic else WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(value)
            set_run_font(r, size=9.2, rtl=arabic)
            if arabic:
                set_rtl(p)
    doc.add_paragraph()
    return table


def add_signature_fields(doc, labels, arabic=False):
    add_heading(doc, "Acknowledgment and Signatures" if not arabic else "إقرار بالاستلام والتوقيع المعتمد", 1, arabic)
    add_para(
        doc,
        "By signing below or acknowledging this document electronically via the Giftisan platform, the undersigned affirms they have reviewed, understood, and agreed to these terms."
        if not arabic else
        "بالتوقيع أدناه أو تأكيد الموافقة الإلكترونية عبر منصة جيفتيزان، يقر الموقع بأنه راجع هذه البنود وفهمها ووافق على الالتزام بها.",
        arabic=arabic,
    )
    for label in labels:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT if arabic else WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(label + " " + "_" * 54)
        set_run_font(r, rtl=arabic)
        if arabic:
            set_rtl(p)


def save_and_copy(doc, filename):
    PUBLIC_DOCS_DIR.mkdir(parents=True, exist_ok=True)
    target_path = PUBLIC_DOCS_DIR / filename
    doc.save(target_path)
    print(f"Generated: {target_path}")
    return target_path



def build_platform_guide():
    doc = prepare_document(
        "Giftisan Platform Working Rules and Controls",
        "Internal operating standard for onboarding, marketplace operations, claims, payouts, and records",
        "Audience: Giftisan founders, operations, customer support, finance, and moderation teams | Version: 2026 v2 working guide",
    )
    add_para(doc, "This guide explains how Giftisan should operate its artisan marketplace so the platform, artisans, and buyers are treated consistently. It is an operating document, not a substitute for an Egyptian lawyer's final contract and tax review.")

    add_heading(doc, "1 Operating model to decide before launch")
    add_para(doc, "Giftisan must choose and document one customer-facing model for each transaction. Do not describe Giftisan as a marketplace in the artisan contract while issuing buyer invoices as the seller without legal and tax advice.")
    add_table(doc, ["Decision", "Giftisan must document", "Owner"], [
        ("Platform role", "Whether Giftisan is an intermediary marketplace, seller of record, or a defined hybrid model.", "Founder and legal counsel"),
        ("Invoice and tax", "Who issues the buyer invoice, whose tax details appear, and who remits applicable taxes.", "Finance and accountant"),
        ("Payment flow", "How buyer money is collected, held, released, reconciled, and refunded. Never describe internal balances as escrow unless the legal structure supports that term.", "Finance and payments"),
        ("Customer support", "Who communicates with buyers and who has authority to approve returns, replacements, credits, and chargebacks.", "Operations lead"),
    ], [1.3, 4.4, 1.1])

    add_heading(doc, "2 Documents Giftisan must keep current")
    add_checklist(doc, [
        "Artisan Partnership Agreement with a unique version number and effective date.",
        "Fee and Payout Schedule showing commission, payment, shipping, reserve, and refund deductions.",
        "Product, Safety, Authenticity, and Intellectual Property Policy.",
        "Returns, Claims, and Appeal Policy for buyers and artisans.",
        "Privacy notice and internal data-access rules for buyer and artisan information.",
        "Customer terms, Arabic product information, and invoice process that match the selected operating model.",
        "A contact address, legal entity name, commercial-registration and tax details once confirmed by counsel.",
    ])

    add_heading(doc, "3 Artisan onboarding control")
    add_para(doc, "No artisan should receive selling privileges until the steps below are complete. The same rule must be applied to every artisan; exceptions need an approved written record.")
    add_table(doc, ["Step", "Required control", "Evidence to retain"], [
        ("Identity", "Verify contact details and collect the identity, workshop, and payout information appropriate to the artisan's legal status.", "Onboarding form and verification status"),
        ("Agreement", "Show the current agreement before acceptance. Capture affirmative clickwrap acceptance. Use a qualified signature process for high-value arrangements if advised.", "Version, language, time, signer account, request metadata"),
        ("Payout", "Confirm beneficiary name and the payout address before any withdrawal is approved.", "Verified payout details and change history"),
        ("Product access", "Moderate the first listings for authenticity, prohibited items, product information, and images.", "Moderation decision and reason"),
        ("Training", "Give the artisan the external handbook and a support contact before their first sale.", "Delivery record or dashboard acknowledgment"),
    ], [1.0, 3.9, 1.9])

    add_heading(doc, "4 Order and payout operating rules")
    add_bullets(doc, [
        "Show the artisan an itemized ledger for each sale: gross item amount, artisan-funded discount, commission, shipping or payment deductions if applicable, reserve, refund debit, and payout.",
        "Release money only under a published timetable tied to verified delivery and the stated refund or fraud-review window.",
        "Do not make an unexplained deduction. Every deduction needs a reason, related order or claim, amount, and decision maker.",
        "Keep undisputed balances separate from disputed amounts. Suspension or closure must not erase the duty to account for undisputed balances.",
        "Give advance notice before a material future change to fees or payout rules. Version the change and preserve the prior terms for affected orders.",
    ])

    add_heading(doc, "5 Claims refunds and defects")
    add_para(doc, "Giftisan should handle the buyer-facing process consistently while giving the artisan a fair chance to respond. Consumer protections cannot be waived by an artisan agreement or a buyer policy.")
    add_table(doc, ["Claim type", "First action", "Responsibility decision"], [
        ("Damaged in transit", "Collect photos, packaging evidence, delivery data, and courier scan history.", "Charge the artisan only where packaging or product fault is supported; otherwise pursue carrier recovery where available."),
        ("Defective or wrong item", "Compare the evidence with the listing and order specification. Give the artisan a response window where practical.", "Offer repair, replacement, or refund as required. Record the reason and the final allocation."),
        ("Not as described", "Review images, description, variants, personalization instructions, and buyer evidence.", "Charge only the part attributable to inaccurate listing or fulfilment."),
        ("Change of mind", "Check whether the item is bespoke and whether an exclusion is legally permitted.", "Do not use a policy to override mandatory consumer rights."),
    ], [1.35, 3.25, 2.2])

    add_heading(doc, "6 Enforcement suspension and appeals")
    add_bullets(doc, [
        "Use immediate suspension only for credible safety, fraud, counterfeit, unlawful-content, or serious abuse risks.",
        "For ordinary quality or timing problems, issue a written reason, evidence, corrective action, deadline, and appeal channel.",
        "Record enforcement decisions consistently. A dashboard notice or email should state the effect on live listings, open orders, and funds.",
        "A person not involved in the first decision should review a timely appeal whenever reasonably possible.",
    ])

    add_heading(doc, "7 Data and intellectual property controls")
    add_bullets(doc, [
        "Give artisans only the buyer data needed to fulfil an order. Do not allow reuse for unrelated marketing or off-platform solicitation.",
        "Keep acceptance logs, financial records, invoices, and claim evidence using a defined retention period set with legal counsel.",
        "The artisan owns their original work. Giftisan's listing and marketing licence should be non-exclusive, limited to marketplace operation, and end after listing removal except for open orders, claims, and record retention.",
        "Use a clear route for counterfeit, copyright, privacy, and safety reports, with a documented takedown process.",
    ])

    add_heading(doc, "8 Monthly control checklist")
    add_checklist(doc, [
        "Reconcile payment provider collections, order totals, artisan ledgers, refunds, and completed payouts.",
        "Review unresolved claims and ensure artisans have received the required evidence and decision reasons.",
        "Check that new or updated artisans accepted the active agreement version before they can create or edit listings.",
        "Audit a sample of listings for authenticity, prohibited goods, accuracy, Arabic customer information, and realistic fulfilment timing.",
        "Review policy changes, support complaints, account suspensions, and appeals for consistent treatment.",
        "Escalate legal, safety, tax, privacy, and recurring-chargeback issues to counsel or the appropriate specialist.",
    ])
    add_signature_fields(doc, ["Prepared by (Operations / Legal):", "Reviewed by (Finance / Tax):", "Approval Date:"], arabic=False)
    return save_and_copy(doc, "Giftisan_Platform_Working_Rules_and_Controls.docx")


def build_artisan_handbook_ar():
    doc = prepare_document(
        "دليل الحرفي في جيفتيزان",
        "الحقوق والواجبات العملية لبيع منتجاتك بأمان ووضوح على المنصة",
        "موجه إلى: الحرفيين وأصحاب الورش في جيفتيزان | نسخة عمل 2026 v2",
        arabic=True,
    )
    add_para(doc, "هذا الدليل يوضح ما نتوقعه من الحرفي وما يحق له طلبه من جيفتيزان. وهو شرح عملي مبسط، أما الاتفاقية النهائية وسياسة المنصة السارية فهما المرجع الملزم عند التسجيل والبيع.", arabic=True)

    add_heading(doc, "1 حقوقك كحرفي", arabic=True)
    add_bullets(doc, [
        "تحتفظ بملكية تصاميمك وأعمالك الأصلية وعلامتك وصور منتجاتك. تستخدم جيفتيزان الصور والمحتوى لتشغيل متجرك وتسويقه فقط وفق الاتفاقية.",
        "يظهر لك كشف رصيد يوضح مبيعاتك والرسوم أو الخصومات أو الاسترجاعات والتحويلات المرتبطة بك.",
        "لك حق معرفة سبب أي خصم أو تعليق أو إزالة لمنتجك، وطلب مراجعة القرار وفق قناة الاعتراض المعلنة.",
        "لا يحق للمنصة حجز أرصدتك غير المتنازع عليها بلا سبب موثق أو دون الالتزام بقواعد التحويل المنشورة.",
        "يمكنك إنهاء علاقتك بالمنصة بعد إنهاء الطلبات والاسترجاعات والتحويلات المعلقة.",
    ], arabic=True)

    add_heading(doc, "2 ما يجب عليك إكماله قبل البيع", arabic=True)
    add_checklist(doc, [
        "اقرأ النسخة الحالية من اتفاقية الحرفيين ووافق عليها من حسابك.",
        "قدم بيانات تواصل وورشة ووسيلة تحويل صحيحة ومحدثة باسم المستفيد الصحيح.",
        "أخبر جيفتيزان فوراً إذا تغير رقم الهاتف أو عنوان الاستلام أو وسيلة التحويل.",
        "تأكد من أي متطلبات ضريبية أو مهنية أو تصاريح تخص نشاطك مع محاسب أو مستشار قانوني عند الحاجة.",
        "اقرأ معايير المنتجات المحظورة وسياسة التغليف وسياسة الاسترجاع قبل نشر أول منتج.",
    ], arabic=True)

    add_heading(doc, "3 قواعد المنتج والصفحة", arabic=True)
    add_table(doc, ["يجب عليك", "لا يجوز لك"], [
        ("عرض منتجات أصلية مصنوعة أو مشطبة أو مخصصة بواسطتك أو تحت إشراف ورشتك.", "عرض منتجات مقلدة، أو استعمال علامة تجارية أو صور لا تملك حق استخدامها."),
        ("كتابة وصف وصور وسعر وخامة ومقاس ووقت تجهيز مطابقين للحقيقة.", "إخفاء عيب مهم أو استخدام صور مضللة أو ادعاء صفة غير موجودة في المنتج."),
        ("تحديد وقت واقعي للقطع الجاهزة والقطع المصنوعة أو المنفذة بالطلب.", "قبول طلب لا تستطيع تنفيذه أو الاستمرار في تأخيره دون إبلاغ جيفتيزان."),
        ("تحديث المخزون والسعر إذا تغيرا.", "البيع خارج المنصة لعميل وصل إليك من جيفتيزان لتجنب الرسوم أو التتبع."),
    ], [3.25, 3.25], arabic=True)

    add_heading(doc, "4 عند وصول طلب جديد", arabic=True)
    add_checklist(doc, [
        "راجع المنتج والكمية واللون أو المقاس وأي تخصيص أو صورة مرفقة قبل بدء العمل.",
        "إذا كان هناك خطأ أو استحالة في التنفيذ، تواصل مع دعم جيفتيزان فوراً ولا تعد العميل بشيء خارج النظام.",
        "جهز الطلب خلال المدة المعلنة في صفحة المنتج. حدّث حالة التنفيذ عندما يطلب منك النظام ذلك.",
        "ضع كود الطلب على الطرد واتبع تعليمات استلام شركة الشحن.",
        "احتفظ بصورة للمنتج النهائي وللتغليف، خصوصاً للقطع القابلة للكسر أو عالية القيمة.",
    ], arabic=True)

    add_heading(doc, "5 التغليف والشحن", arabic=True)
    add_para(doc, "أنت مسؤول عن تجهيز المنتج وتغليفه بشكل يناسب طبيعته. استخدم طبقات حماية مناسبة للزجاج والخزف والخشب والحلي، وثبت الأجزاء المتحركة، واستخدم كرتوناً مناسباً. إذا أثبتت الأدلة أن الضرر بسبب ضعف تغليف من الورشة، قد تتحمل تكلفة الحل. أما إذا كان التغليف سليماً وحدث الضرر في النقل، فتتابع جيفتيزان مع شركة الشحن عند توفر ذلك.", arabic=True)

    add_heading(doc, "6 الشكاوى والاسترجاع", arabic=True)
    add_bullets(doc, [
        "القطع المنفذة بالطلب أو المنقوشة قد لا تخضع لإرجاع تغيير الرأي إذا سمح القانون وكانت مطابقة للوصف والطلب.",
        "حقوق العميل في المنتج المعيب أو غير الآمن أو المخالف للوصف لا تختفي بسبب كون المنتج يدوياً أو مخصصاً.",
        "عند فتح مطالبة، راجع الصور والتفاصيل ورد خلال المهلة التي يبلغك بها الدعم. اقترح إصلاحاً أو استبدالاً أو حلاً مناسباً عندما تكون المشكلة مرتبطة بمنتجك.",
        "اطلب مراجعة إذا اعتقدت أن الخصم أو القرار غير صحيح. احتفظ بصور التغليف وأي إثباتات تسليم أو محادثات داخل المنصة.",
    ], arabic=True)

    add_heading(doc, "7 الأموال والتحويلات", arabic=True)
    add_bullets(doc, [
        "راجع كشف الرصيد بعد كل بيع ولا تعتمد على رسالة أو وعد شفهي فقط.",
        "تظهر الأرباح الصافية بعد المدة المعلنة للتسليم والمراجعة. قد تتأثر بعض المبالغ باسترجاع أو نزاع أو مراجعة احتيال موثقة.",
        "لا تشارك بيانات وسيلة التحويل أو رمز التحقق مع أي شخص. استخدم قناة الدعم الرسمية عند تغيير بيانات المستفيد.",
        "اطلب توضيحاً لأي خصم في كشف الرصيد، مع رقم الطلب وسبب الخصم ومبلغه.",
    ], arabic=True)

    add_heading(doc, "8 بيانات العملاء والسلوك المهني", arabic=True)
    add_bullets(doc, [
        "استخدم اسم العميل ورقم هاتفه وعنوانه فقط لتجهيز وتسليم الطلب.",
        "لا تضف العميل إلى تسويق مستقل أو تشارك بياناته أو تتواصل معه خارج ما يلزم للطلب دون أساس واضح ومسموح.",
        "تواصل باحترام. لا تستخدم رسائل مسيئة أو تهديدية ولا توجه العميل للدفع على واتساب أو أي قناة خارج المنصة للطلب الذي بدأ عبر جيفتيزان.",
        "أبلغ عن المنتجات الخطرة أو المقلدة أو أي استخدام غير مصرح به للصور أو العلامات.",
    ], arabic=True)

    add_heading(doc, "9 متى قد يوقف المتجر", arabic=True)
    add_para(doc, "قد يوقف المتجر فوراً عند وجود خطر سلامة أو احتيال أو تقليد أو محتوى غير مشروع. في المشكلات العادية مثل تكرار التأخير أو ضعف الوصف أو التغليف، يفترض أن تحصل على سبب واضح وفرصة معقولة للتصحيح عندما يكون ذلك مناسباً. لا يزيل إيقاف المتجر حقك في كشف أرصدتك غير المتنازع عليها أو طلب مراجعة القرار.", arabic=True)
    add_signature_fields(doc, ["اسم الحرفي أو اسم الورشة:", "رقم الهاتف أو البريد:", "رقم نسخة الاتفاقية التي تمت مراجعتها:", "التاريخ:", "التوقيع أو تأكيد الموافقة الإلكترونية:"], arabic=True)
    return save_and_copy(doc, "Giftisan_Artisan_Rights_and_Obligations_AR.docx")


def build_artisan_handbook_en():
    doc = prepare_document(
        "Giftisan Artisan Handbook: Rights and Obligations",
        "Practical rights, standards, and responsibilities for selling safely and transparently on Giftisan",
        "Audience: Artisans and workshop owners | Working Guide 2026 v2",
        arabic=False,
    )
    add_para(doc, "This handbook outlines what Giftisan expects from each artisan and what rights the artisan holds on the platform. It provides clear operational guidance, while the formal Artisan Partnership Agreement and current platform policies remain the legally binding framework.")

    add_heading(doc, "1 Your Rights as an Artisan")
    add_bullets(doc, [
        "You retain absolute ownership of all original craft designs, studio marks, and listing media. Giftisan uses your content strictly to operate and market the marketplace under the agreement.",
        "You have full visibility into an itemized balance ledger detailing every sale, fee, reserve, refund deduction, and completed payout.",
        "You are entitled to written reasons for any deduction, temporary suspension, or listing removal, with access to an appeal channel.",
        "Giftisan will never withhold undisputed balances without a documented cause or outside the published payout timetable.",
        "You may terminate your store relationship at any time after fulfilling pending orders, returns, and payout reconciliations.",
    ])

    add_heading(doc, "2 What to Complete Before Selling")
    add_checklist(doc, [
        "Review and affirmatively accept the current Artisan Partnership Agreement from your dashboard.",
        "Provide accurate contact details, workshop location, and payout account under the correct beneficiary name.",
        "Notify Giftisan immediately if your phone number, pickup address, or payout method changes.",
        "Ensure compliance with applicable Egyptian craft permits and tax duties with your accountant or legal advisor.",
        "Review the prohibited goods standard, packaging guidelines, and returns policy before publishing your first listing.",
    ])

    add_heading(doc, "3 Product and Listing Rules")
    add_table(doc, ["You Must", "You Must Not"], [
        ("List authentic goods designed, handcrafted, finished, or customized by you or directly under your workshop supervision.", "List counterfeit items, factory replicas, or use trademarks or photographs you do not own."),
        ("Provide truthful descriptions, photographs, pricing, dimensions, materials, and handling times.", "Conceal material defects, use deceptive images, or claim properties the item does not possess."),
        ("Set realistic turnaround schedules for ready-made versus custom made-to-order creations.", "Accept orders you cannot fulfill or delay shipments repeatedly without notifying Giftisan."),
        ("Keep inventory status and prices accurately synchronized.", "Solicit buyers to complete transactions off-platform to avoid fees or order tracking."),
    ], [3.25, 3.25])

    add_heading(doc, "4 When a New Order Arrives")
    add_checklist(doc, [
        "Inspect product specifications, quantity, personalization text, and attached reference images before starting work.",
        "If there is an error or inability to fulfill, contact Giftisan support immediately without making offline promises to the buyer.",
        "Prepare the parcel within the declared lead time and update execution status in your dashboard.",
        "Attach the clear Giftisan order code to the outer parcel and follow courier handover instructions.",
        "Retain photographic evidence of the completed piece and outer packaging, especially for fragile or high-value items.",
    ])

    add_heading(doc, "5 Packaging and Transit Safety")
    add_para(doc, "You are responsible for protective packaging suited to the item's materials. Use reinforced corrugated boxes, bubble cushioning, and corner protectors for ceramics, glass, woodwork, and jewelry. If evidence proves damage occurred due to substandard workshop packaging, the artisan bears the replacement or refund cost. If packaging was sound and damage resulted from carrier mishandling, Giftisan pursues compensation from the carrier.")

    add_heading(doc, "6 Claims, Returns, and Disputes")
    add_bullets(doc, [
        "Bespoke or engraved items may be exempt from change-of-mind returns where permitted by law and matching agreed specs.",
        "Statutory consumer protections for defective, unsafe, or misdescribed products cannot be excluded for handmade goods.",
        "When a claim is opened, inspect the evidence and reply within the 48-hour response window.",
        "Request review if a deduction is disputed. Preserve packaging photos and platform message records.",
    ])

    add_heading(doc, "7 Payouts and Balance Management")
    add_bullets(doc, [
        "Monitor your itemized balance ledger regularly after every completed sale.",
        "Net earnings are released 7 business days following confirmed courier delivery, subject to return and fraud review windows.",
        "Never share OTP codes or payout credentials. Use the official support channel for beneficiary account changes.",
        "Request immediate itemization for any balance adjustment, including order number, reason, and amount.",
    ])

    add_heading(doc, "8 Customer Data and Professional Conduct")
    add_bullets(doc, [
        "Use customer contact and delivery details strictly to fulfill the specific order.",
        "Do not harvest buyer data for private marketing, WhatsApp sales, or unsolicited communication.",
        "Maintain respectful communication at all times. Threats, abuse, or attempts to divert payments offline are strictly prohibited.",
        "Report suspected counterfeits, dangerous goods, or intellectual property infringements promptly.",
    ])

    add_heading(doc, "9 Shop Suspension and Appeals")
    add_para(doc, "Immediate store suspension is reserved for credible safety, counterfeit, fraud, or unlawful content risks. For routine performance or packaging problems, artisans receive written notification, evidence, a cure period, and an appeal route. Suspension never extinguishes the right to account for and withdraw undisputed balances.")
    add_signature_fields(doc, ["Artisan / Workshop Name:", "Phone / Email Contact:", "Agreement Version Reviewed:", "Date:", "Signature / Digital Confirmation:"], arabic=False)
    return save_and_copy(doc, "Giftisan_Artisan_Rights_and_Obligations_EN.docx")


def build_artisan_agreement_en():
    doc = prepare_document(
        "Giftisan Artisan Partnership Agreement",
        "Official commercial, operational, and escrow terms governing independent Egyptian makers and Giftisan",
        "Parties: Giftisan Marketplace & Independent Artisan Partner | Version: 2026-v2",
        arabic=False,
    )
    add_para(doc, "This Artisan Partnership Agreement ('Agreement') sets forth the binding legal and operational framework between Giftisan ('Platform') and the independent artisan, maker, or workshop ('Artisan'). By registering a shop, accepting electronically on the Platform, or listing handcrafted products, the Artisan agrees to all terms herein.")

    add_table(doc, ["Core Protection", "Key Commitment", "Platform Guarantee"], [
        ("Graduated Commission (0% – 8% – 10%)", "0% first 6 mos, 8% second 6 mos, 10% third 6 mos+.", "Platform commission scales predictably with transparent deductions and zero hidden fees."),
        ("Handcrafted Authenticity", "Strictly authentic Egyptian craft & bespoke goods.", "Mass factory imports and drop-shipping are prohibited to protect makers."),
        ("7-Day Escrow Payouts", "Reliable delivery-linked payout release cycle.", "Withdrawable to InstaPay or bank wallets 7 business days after verified delivery."),
        ("Doorstep Courier Pickup", "Partner couriers collect safely boxed parcels.", "Shipments collected directly from the artisan's workshop or home address."),
    ], [1.7, 2.7, 2.5])

    add_heading(doc, "Section 1: Independent Contractor & Workshop Relationship")
    add_para(doc, "The Artisan operates as an independent seller and craftsman, not as an employee, franchisee, or joint-venture partner of Giftisan. The Artisan exercises exclusive control over workshop hours, techniques, raw materials, and creative methods, and remains solely responsible for local Egyptian tax registrations and municipal craft permits where applicable.")

    add_heading(doc, "Section 2: Handcrafted Authenticity & Prohibited Goods")
    add_para(doc, "Giftisan is exclusively dedicated to genuine Egyptian craftsmanship. Every listed item must be designed, handmade, finished, or customized by the artisan. Commercial mass-manufactured factory goods, dropshipped foreign imports (e.g., from generic wholesale markets), and counterfeit replicas are strictly prohibited. Listing unverified factory items constitutes immediate grounds for shop suspension without prior notice. Natural variations in handcrafted materials (wood grains, ceramic glazes, textile weaves) are celebrated hallmarks of authenticity, not defects.")

    add_heading(doc, "Section 3: Studio Operations, Lead Times & Courier Handover")
    add_para(doc, "Artisans must fulfill orders within their declared processing time. Ready-to-ship products must be packaged within 2 to 4 business days. For customized or made-to-order creations, the artisan must accurately specify realistic production timelines. When partner couriers arrive for collection, parcels must be securely packed with the Giftisan order code clearly marked. Repeatedly missing courier pickups damages buyer trust and may result in temporary listing deactivation.")

    add_heading(doc, "Section 4: Protective Packaging & Transit Liability")
    add_para(doc, "Handcrafted goods (ceramics, woodwork, glass, leather, and jewelry) require protective, drop-resistant packaging (corrugated cardboard, bubble wrap, corner guards). If an item arrives broken due to inadequate workshop packaging, the artisan is responsible for replacement or cost resolution. If an item is damaged despite proper packaging due to courier mishandling, Giftisan will advocate and file a carrier compensation claim on the artisan's behalf.")

    add_heading(doc, "Section 5: Pricing, Graduated Platform Commission & Escrow Payouts")
    add_para(doc, "Artisans set their own retail prices. Platform commission follows a transparent graduated tier based on shop account age: 0% platform commission during the first 6 months (months 1–6), 8% platform commission during the second 6 months (months 7–12), and 10% platform commission for the third 6 months and onward (month 13+) of each artisan's product sales. Each sale, fee, refund, reserve, and payout appears in an itemized balance ledger. Net earnings are released to the artisan's withdrawable balance 7 business days after confirmed delivery, subject to the stated holding, refund, and fraud-review rules. Giftisan will give advance notice of material fee or payout-rule changes; they apply only from the stated effective date.")

    add_heading(doc, "Section 6: Custom Orders, Returns & Dispute Mediation")
    add_para(doc, "Personalized or bespoke items may be excluded from a change-of-mind return only where permitted by applicable law and when they match the agreed specifications. Consumer rights for defective, unsafe, or misdescribed products are never reduced. Giftisan records claim evidence and gives the artisan 48 hours to respond where practicable. An artisan is charged only for a resolution reasonably attributable to the product, description, or packaging, with the reason and amount recorded in the balance ledger and a route to request review.")

    add_heading(doc, "Section 7: Intellectual Property & Marketing Rights")
    add_para(doc, "Artisans retain ownership of their original creations, designs, studio marks, and listing media. By publishing a listing, the artisan grants Giftisan a non-exclusive, royalty-free, revocable licence to host, display, translate, and promote that listing solely to operate and market the marketplace. The licence ends when the listing is removed, except for a reasonable period needed to complete outstanding orders, resolve claims, and retain legal records. Giftisan may not sell or license the artisan's work to third parties without separate written permission.")

    add_heading(doc, "Section 8: Platform Integrity, Term & Termination")
    add_para(doc, "Artisans must not redirect buyers to complete off-platform payments for marketplace sales. Either party may end the relationship after outstanding orders, refunds, and payouts are handled. Except for urgent safety, fraud, or unlawful-content risks, Giftisan will provide a reason for suspension or removal, a reasonable opportunity to cure where appropriate, and a route to appeal. Ending or suspending a shop does not remove Giftisan's obligation to account for and pay undisputed balances under the published payout rules.")

    add_signature_fields(doc, ["Artisan / Studio Name:", "National ID / Registration No.:", "Authorized Signature:", "Platform Representative:", "Effective Date:"], arabic=False)
    return save_and_copy(doc, "Giftisan_Artisan_Partnership_Agreement_2026_v2_EN.docx")


def build_artisan_agreement_ar():
    doc = prepare_document(
        "عقد اتفاقية وشراكة الحرفيين في جيفتيزان",
        "الوثيقة القانونية والتشغيلية المعتمدة لورش وصناع الحرف اليدوية في جمهورية مصر العربية",
        "الأطراف: منصة جيفتيزان والحرفي المستقل الشريك | الإصدار المعتمد: 2026-v2",
        arabic=True,
    )
    add_para(doc, "تحدد هذه الاتفاقية الإطار القانوني والتشغيلي والمالي الملزم بين منصة جيفتيزان والحرفي أو صانع المشغولات اليدوية أو صاحب الورشة. يُعد تسجيل المتجر أو الموافقة الإلكترونية أو إدراج المنتجات في المنصة إقراراً بالموافقة على كافة الشروط الواردة في هذا العقد.", arabic=True)

    add_table(doc, ["الضمانة الأساسية", "الالتزام التجاري", "التزام المنصة"], [
        ("عمولة تصاعدية (0% – 8% – 10%)", "0% أول 6 أشهر، 8% ثاني 6 أشهر، 10% ثالث 6 أشهر وما بعدها.", "تطبق المنصة هيكل عمولة متدرج وشفاف بحسب عمر حساب المتجر مع شمولية رسوم الدفع وبدون مصاريف خفية."),
        ("أصالة الصناعة اليدوية", "حصرية للمشغولات اليدوية والمصنوعة محلياً.", "يُحظر بيع بضائع المصانع والدروب شيبينغ حمايةً للحرفيين الحقيقيين."),
        ("ضمان مالي لمدة 7 أيام", "تحويلات مالية دورية مرتبطة بتأكيد التسليم.", "تُحوّل الأرباح الصافية إلى إنستاباي أو المحفظة الإلكترونية بعد 7 أيام عمل من التسليم."),
        ("استلام من باب ورشتك", "تجهيز وتغليف آمن وسليم للطرود.", "مندوبو شركات الشحن الشريكة يستلمون الشحنات مباشرة من ورشتك أو منزلك."),
    ], [1.7, 2.7, 2.5], arabic=True)

    add_heading(doc, "البند الأول: صفة الحرفي واستقلاليته القانونية", 1, arabic=True)
    add_para(doc, "يعمل الحرفي كبائع وصانع مستقل بذاته، ولا يُعد موظفاً أو وكيلاً أو شريكاً تجارياً أو ممثلاً قانونياً لمنصة جيفتيزان. يمتلك الحرفي السيطرة التامة والمطلقة على أوقات عمل ورشته، وتقنيات الإنتاج، والمواد الخام المستخدمة، ويكون مسؤولاً منفرداً عن أي التزامات ضريبية محلية أو تصاريح مهنية ترتبط بنشاطه الخاص وفقاً للقوانين المصرية المعمول بها.", arabic=True)

    add_heading(doc, "البند الثاني: معايير الأصالة والمنتجات المحظورة", 1, arabic=True)
    add_para(doc, "جيفتيزان منصة مكرسة حصرياً للإبداع الحرفي اليدوي المصري. يجب أن تكون كافة المنتجات المعروضة مصنوعة أو مجمعة أو مشطبة يدوياً أو مخصصة بالطلب بواسطة الحرفي أو تحت إشراف ورشته المباشر. يُحظر تماماً وبشكل قاطع عرض البضائع التجارية المصنعة آلياً في المصانع، أو المنتجات المستوردة المعاد بيعها (كالدروب شيبينغ أو بضائع أسواق الجملة)، أو المقلدة لعلامات تجارية. يُعد إدراج أي منتجات تجارية غير يدوية سبباً موجباً لإيقاف المتجر فوراً. تُعتبر الفروق الطبيعية الدقيقة في خامات الصناعة اليدوية (مثل عروق الخشب، تموجات طلاء الخزف، درجات صباغة النسيج) علامات أصالة مميزة وليست عيوباً تصنيعية.", arabic=True)

    add_heading(doc, "البند الثالث: جاهزية الطلبات والالتزام بمواعيد الشحن", 1, arabic=True)
    add_para(doc, "يلتزم الحرفي بتجهيز وتغليف الطلبات خلال المدة المحددة مسبقاً في صفحة المنتج. تُجهز القطع الجاهزة للشحن خلال 2 إلى 4 أيام عمل، بينما يحدد الحرفي بدقة فترة التنفيذ للقطع المنفذة بالطلب أو المخصصة. عند وصول مندوب شركة الشحن المعتمدة إلى الورشة، يجب أن تكون الشحنة مغلفة بإحكام ومدون عليها كود طلب جيفتيزان بوضوح. تكرار عدم جاهزية الطلبات أو تخلف الحرفي عن تسليم الشحنات يضر بثقة العملاء ويعرض حسابه للتعليق المؤقت.", arabic=True)

    add_heading(doc, "البند الرابع: معايير التغليف الوقائي ومسؤولية سلامة الشحن", 1, arabic=True)
    add_para(doc, "نظراً لطبيعة المشغولات اليدوية الحساسة (كالخزف، والزجاج، والتحف الخشبية، والحلي)، يلتزم الحرفي بتغليف المنتجات تغليفاً وقائياً متيناً ومقاوماً للصدمات باستخدام الكرتون المقوى والفقاعات الهوائية وحاميات الزوايا. إذا تلفت الشحنة نتيجة سوء التغليف أو ضعفه من جهة الحرفي، يتحمل الحرفي تكلفة التعويض أو إعادة التصنيع. أما إذا حدث التلف نتيجة إهمال مثبت من شركة الشحن رغم جودة التغليف، تتولى جيفتيزان المطالبة بالتعويض من شركة الشحن نيابة عن الحرفي.", arabic=True)

    add_heading(doc, "البند الخامس: التسعير، هيكل العمولة المتدرج، ودورة التحويل المالي", 1, arabic=True)
    add_para(doc, "يحدد الحرفي أسعار بيع منتجاته بحرية. وتطبق المنصة هيكل عمولة متدرج وشفاف بناءً على عمر حساب متجر الحرفي: 0% عمولة للمنصة طوال أول 6 أشهر (الشهور 1–6)، و8% عمولة للمنصة خلال ثاني 6 أشهر (الشهور 7–12)، و10% عمولة للمنصة لثالث 6 أشهر وما بعدها (الشهر 13 وما يليه) من مبيعات كل منتج للحرفي. يظهر في كشف رصيد تفصيلي كل بيع ورسوم واسترجاع واحتياطي وتحويل مالي. يصبح صافي الأرباح متاحاً للسحب بعد 7 أيام عمل من تأكيد التسليم، وفقاً لقواعد فترة الحجز والاسترجاع ومراجعة الاحتيال المعلنة. تلتزم جيفتيزان بإشعار مسبق عند أي تغيير جوهري في الرسوم أو قواعد التحويل، ويطبق التغيير من تاريخ سريانه المعلن فقط.", arabic=True)

    add_heading(doc, "البند السادس: القطع المنفذة بالطلب، سياسة الاسترجاع، والوساطة", 1, arabic=True)
    add_para(doc, "يجوز استثناء القطع المنفذة خصيصاً أو المنقوش عليها من الإرجاع لتغيير رأي العميل فقط بالقدر الذي يسمح به القانون وبشرط مطابقتها للمواصفات المتفق عليها. ولا تنتقص هذه الاتفاقية من حقوق المستهلك في المنتج المعيب أو غير الآمن أو المخالف للوصف. تسجل جيفتيزان أدلة المطالبة وتمنح الحرفي 48 ساعة للرد متى كان ذلك عملياً. ولا يُحمّل الحرفي أي مبلغ إلا إذا كان الحل مرتبطاً بصورة معقولة بالمنتج أو وصفه أو تغليفه، مع بيان السبب والمبلغ في كشف الرصيد وإتاحة طلب المراجعة.", arabic=True)

    add_heading(doc, "البند السابع: حقوق الملكية الفكرية والترخيص الترويجي", 1, arabic=True)
    add_para(doc, "يحتفظ الحرفي بملكية أعماله الأصلية وتصاميمه وعلاماته وصور منتجاته. وبنشر المنتج يمنح جيفتيزان ترخيصاً غير حصري ومجانياً وقابلاً للإلغاء لاستضافة المنتج وعرضه وترجمة وصفه والترويج له، وذلك حصراً لتشغيل المنصة وتسويقها. ينتهي الترخيص عند إزالة المنتج، باستثناء المدة المعقولة اللازمة لإتمام الطلبات المعلقة وحل المطالبات والاحتفاظ بالسجلات القانونية. ولا يجوز لجيفتيزان بيع أعمال الحرفي أو ترخيصها للغير دون إذن كتابي مستقل.", arabic=True)

    add_heading(doc, "البند الثامن: نزاهة المعاملات، مدة العقد وإنهاؤه", 1, arabic=True)
    add_para(doc, "يحظر على الحرفي توجيه العملاء لإتمام الدفع خارج المنصة لمعاملات بدأت عبر جيفتيزان. يحق لأي من الطرفين إنهاء هذه الشراكة بعد تسوية الطلبات والاسترجاعات والتحويلات المعلقة. باستثناء حالات المخاطر الجسيمة (كالاحتيال أو المنتجات غير الآمنة أو المحتوى المخالف للقانون)، تقدم جيفتيزان سبباً كتابياً لأي إيقاف أو إزالة مع فرصة معقولة للتصحيح وحق الاعتراض. لا يسقط إنهاء الحساب أو إيقافه التزام المنصة بمحاسبة الحرفي وسداد مستحقاته غير المتنازع عليها وفق قواعد التحويل المعلنة.", arabic=True)

    add_signature_fields(doc, ["اسم الحرفي أو اسم الورشة:", "الرقم القومي / السجل:", "توقيع الحرفي المعتمد:", "ممثل منصة جيفتيزان:", "تاريخ السريان والتوثيق:"], arabic=True)
    return save_and_copy(doc, "Giftisan_Artisan_Partnership_Agreement_2026_v2_AR.docx")


if __name__ == "__main__":
    print("Building Giftisan Legal & Operational Documentation Suite...")
    build_platform_guide()
    build_artisan_handbook_ar()
    build_artisan_handbook_en()
    build_artisan_agreement_en()
    build_artisan_agreement_ar()
    print("All documents generated and synchronized successfully.")
