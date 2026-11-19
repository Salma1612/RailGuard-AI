"""RailGuard AI - Streamlit dashboard.

Final deployment model: EfficientNetB0 (the saved checkpoint
``models/efficientnet_b0_best.pt``). There is intentionally no model selector:
every upload is classified by EfficientNetB0 only.

Run with:  streamlit run app.py
"""
from __future__ import annotations

import html

import streamlit as st
from PIL import Image, ImageOps

from railguard import config
from railguard.predict import ModelUnavailable, Predictor

# --------------------------------------------------------------------------- #
# Constants
# --------------------------------------------------------------------------- #
FINAL_MODEL_ID = "efficientnet_b0"          # the ONLY model used for predictions
FINAL_MODEL_NAME = "EfficientNetB0"
TEST_ACCURACY = "93.64%"                    # test-set metrics (see README / report)
TEST_MACRO_F1 = "88.36%"
GITHUB_URL = "https://github.com/Salma1612/RailGuard-AI"

# Visual style per class. Keys are the exact class names from railguard.config.
CLASS_STYLES: dict[str, dict[str, str]] = {
    "Broken Track": {
        "icon": "🚨", "color": "#ef4444", "bg": "rgba(239,68,68,.16)",
        "status": "Defect detected", "kind": "defect",
        "message": "The model classified this image as a broken track. "
                   "Have the section checked by a qualified inspector.",
    },
    "Loose Bolts": {
        "icon": "🔩", "color": "#f97316", "bg": "rgba(249,115,22,.16)",
        "status": "Defect detected", "kind": "defect",
        "message": "The model classified this image as showing loose bolts. "
                   "Physical verification is recommended.",
    },
    "Missing Parts": {
        "icon": "⚠️", "color": "#f59e0b", "bg": "rgba(245,158,11,.16)",
        "status": "Defect detected", "kind": "defect",
        "message": "The model classified this image as showing missing track parts. "
                   "Physical verification is recommended.",
    },
    "Rust": {
        "icon": "🟤", "color": "#c2763a", "bg": "rgba(194,118,58,.18)",
        "status": "Defect detected", "kind": "defect",
        "message": "The model classified this image as showing rust or corrosion. "
                   "Schedule an inspection of the affected area.",
    },
    "Normal Track": {
        "icon": "✅", "color": "#10b981", "bg": "rgba(16,185,129,.16)",
        "status": "No defect identified", "kind": "normal",
        "message": "The model classified this image as normal track. "
                   "This is an AI classification, not a safety certification.",
    },
}

CLASS_BLURBS = [
    ("🚨", "Broken Track", "Cracked or fractured rail"),
    ("🔩", "Loose Bolts", "Loose track fasteners"),
    ("⚠️", "Missing Parts", "Absent track components"),
    ("🟤", "Rust", "Rust or corrosion"),
    ("✅", "Normal Track", "No visible defect"),
]

# --------------------------------------------------------------------------- #
# Page configuration
# --------------------------------------------------------------------------- #
st.set_page_config(
    page_title="RailGuard AI",
    page_icon="🚆",
    layout="wide",
    initial_sidebar_state="collapsed",
)

CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

:root{
  --forest:#06241b; --deep:#0b3d2e; --emerald:#10b981; --teal:#14b8a6;
  --amber:#f59e0b; --text:#ecfdf5; --muted:#a7c7bb;
  --glass:rgba(255,255,255,.07); --glass-border:rgba(255,255,255,.14);
}
html, body, [class*="css"], .stApp { font-family:'Inter',system-ui,sans-serif; }
.stApp{
  background:
    radial-gradient(1100px 500px at 8% -10%, rgba(20,184,166,.28), transparent 60%),
    radial-gradient(900px 500px at 100% 0%, rgba(16,185,129,.20), transparent 55%),
    linear-gradient(160deg, #04170f 0%, #06241b 45%, #0b3d2e 100%);
  background-attachment: fixed;
  color: var(--text);
}
header[data-testid="stHeader"]{ background:transparent; }
#MainMenu, footer{ visibility:hidden; }
section[data-testid="stSidebar"]{ display:none; }
.block-container{ padding-top:1.6rem; padding-bottom:2rem; max-width:1180px; }

/* ---------- hero ---------- */
.hero{
  position:relative; overflow:hidden; border-radius:28px; padding:2.6rem 2.4rem;
  background:linear-gradient(135deg, rgba(16,185,129,.30), rgba(20,184,166,.16) 55%, rgba(245,158,11,.14));
  border:1px solid var(--glass-border);
  box-shadow:0 24px 60px rgba(0,0,0,.35);
  backdrop-filter:blur(14px);
}
.hero::after{ /* railway sleepers + rails */
  content:""; position:absolute; left:0; right:0; bottom:0; height:46px; opacity:.55;
  background:
    linear-gradient(#cbd5e1,#cbd5e1) 0 10px/100% 3px no-repeat,
    linear-gradient(#cbd5e1,#cbd5e1) 0 30px/100% 3px no-repeat,
    repeating-linear-gradient(90deg, #92602b 0 14px, transparent 14px 46px) 0 4px/100% 36px no-repeat;
}
.badge{
  display:inline-flex; align-items:center; gap:.45rem; padding:.38rem .85rem; border-radius:999px;
  font-size:.82rem; font-weight:600; letter-spacing:.02em; color:#fde68a;
  background:rgba(245,158,11,.16); border:1px solid rgba(245,158,11,.45);
}
.hero h1{
  margin:.9rem 0 .2rem; font-size:3.1rem; line-height:1.1; font-weight:800;
  background:linear-gradient(90deg,#ecfdf5,#6ee7b7 55%,#5eead4);
  -webkit-background-clip:text; background-clip:text; color:transparent;
}
.hero .sub{ font-size:1.2rem; font-weight:600; color:#d1fae5; margin:0 0 .8rem; }
.hero p.desc{ max-width:760px; color:var(--muted); font-size:1rem; line-height:1.65; margin:0 0 3rem; }

/* ---------- glass cards ---------- */
.glass{
  background:var(--glass); border:1px solid var(--glass-border); border-radius:22px;
  padding:1.5rem 1.6rem; box-shadow:0 14px 40px rgba(0,0,0,.28); backdrop-filter:blur(12px);
}
.section-title{ font-size:1.45rem; font-weight:700; margin:2rem 0 .3rem; color:#ecfdf5; }
.section-sub{ color:var(--muted); margin:0 0 1rem; font-size:.95rem; }
.step{
  display:inline-flex; align-items:center; justify-content:center; width:1.7rem; height:1.7rem;
  border-radius:50%; background:linear-gradient(135deg,#10b981,#14b8a6); color:#022c22;
  font-weight:800; font-size:.85rem; margin-right:.5rem;
}

/* ---------- class chips ---------- */
.chips{ display:grid; grid-template-columns:repeat(5,1fr); gap:.8rem; margin-top:1rem; }
.chip{
  background:var(--glass); border:1px solid var(--glass-border); border-radius:16px;
  padding:.9rem .7rem; text-align:center;
}
.chip .i{ font-size:1.5rem; } .chip .n{ font-weight:700; font-size:.92rem; margin-top:.2rem; }
.chip .d{ color:var(--muted); font-size:.76rem; margin-top:.15rem; }

/* ---------- uploader ---------- */
div[data-testid="stFileUploader"] section,
div[data-testid="stFileUploaderDropzone"]{
  background:linear-gradient(135deg, rgba(16,185,129,.14), rgba(20,184,166,.08));
  border:2px dashed rgba(110,231,183,.65); border-radius:20px; padding:1.8rem 1rem;
  transition:border-color .2s, background .2s;
}
div[data-testid="stFileUploaderDropzone"]:hover{ border-color:#fbbf24; background:rgba(16,185,129,.2); }
div[data-testid="stFileUploader"] label p{ color:var(--text); font-weight:600; }
div[data-testid="stFileUploaderDropzone"] button{
  border-radius:12px; border:1px solid rgba(110,231,183,.6); background:rgba(16,185,129,.2); color:#ecfdf5;
}

/* ---------- buttons ---------- */
div.stButton > button{
  width:100%; border:0; border-radius:14px; padding:.8rem 1rem; font-weight:700; font-size:1.02rem;
  color:#022c22; background:linear-gradient(90deg,#34d399,#2dd4bf);
  box-shadow:0 10px 26px rgba(16,185,129,.35); transition:transform .15s, box-shadow .15s;
}
div.stButton > button:hover{ transform:translateY(-1px); box-shadow:0 14px 30px rgba(16,185,129,.5); color:#022c22; }
div.stButton > button:focus:not(:active){ color:#022c22; border:0; }

/* ---------- images ---------- */
div[data-testid="stImage"] img{ border-radius:18px; border:1px solid var(--glass-border); box-shadow:0 10px 30px rgba(0,0,0,.35); }

/* ---------- result card ---------- */
.result{
  border-radius:22px; padding:1.5rem 1.6rem; border:1px solid var(--rc); background:var(--rbg);
  box-shadow:0 14px 40px rgba(0,0,0,.28), inset 4px 0 0 var(--rc); backdrop-filter:blur(10px);
}
.result .status{
  display:inline-block; padding:.25rem .7rem; border-radius:999px; font-size:.78rem; font-weight:700;
  color:var(--rc); border:1px solid var(--rc); background:rgba(0,0,0,.2);
}
.result .cls{ font-size:2.2rem; font-weight:800; margin:.6rem 0 .1rem; color:#fff; }
.result .msg{ color:#d1e7de; font-size:.95rem; line-height:1.55; margin:.4rem 0 1rem; }
.bar{ height:12px; border-radius:99px; background:rgba(255,255,255,.12); overflow:hidden; }
.bar > span{ display:block; height:100%; border-radius:99px; background:linear-gradient(90deg, var(--rc), #fde68a); }
.meta{ display:flex; flex-wrap:wrap; gap:.5rem; margin-top:1rem; }
.pill{
  padding:.3rem .75rem; border-radius:999px; background:rgba(255,255,255,.09);
  border:1px solid var(--glass-border); font-size:.8rem; color:#d1fae5;
}
.warn{
  margin-top:1rem; padding:.8rem 1rem; border-radius:14px; font-size:.88rem; color:#fde68a;
  background:rgba(245,158,11,.14); border:1px solid rgba(245,158,11,.5);
}
.placeholder{ text-align:center; color:var(--muted); padding:2.4rem 1rem; }
.placeholder .big{ font-size:2.6rem; }

/* ---------- metrics ---------- */
.metric-grid{ display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; margin:1rem 0; }
.metric{
  border-radius:18px; padding:1.2rem; text-align:center;
  background:linear-gradient(135deg, rgba(16,185,129,.22), rgba(20,184,166,.12));
  border:1px solid var(--glass-border);
}
.metric .v{ font-size:2.2rem; font-weight:800; color:#6ee7b7; }
.metric .l{ color:var(--muted); font-size:.85rem; }
.note{
  font-size:.86rem; color:#fde68a; background:rgba(245,158,11,.10);
  border-left:3px solid var(--amber); padding:.7rem .9rem; border-radius:10px; margin-top:.8rem;
}
.glass ul{ margin:.4rem 0 0 1.1rem; color:#d1e7de; line-height:1.8; }
.glass h3{ margin:0 0 .4rem; font-size:1.15rem; }
.glass p{ color:#d1e7de; line-height:1.65; }

/* ---------- footer ---------- */
.footer{
  margin-top:2.5rem; padding:1.4rem; text-align:center; border-radius:20px;
  background:rgba(0,0,0,.25); border:1px solid var(--glass-border); color:var(--muted); font-size:.9rem;
}
.footer b{ color:#ecfdf5; }
.footer a{ color:#6ee7b7; text-decoration:none; font-weight:600; }
.footer a:hover{ text-decoration:underline; }

/* ---------- responsive ---------- */
@media (max-width: 820px){
  .hero{ padding:1.6rem 1.2rem; border-radius:22px; }
  .hero h1{ font-size:2.2rem; }
  .hero .sub{ font-size:1rem; }
  .chips{ grid-template-columns:repeat(2,1fr); }
  .result .cls{ font-size:1.7rem; }
  .metric-grid{ grid-template-columns:1fr; }
}
</style>
"""
st.markdown(CSS, unsafe_allow_html=True)


# --------------------------------------------------------------------------- #
# Model loading (cached: loaded once per server process)
# --------------------------------------------------------------------------- #
@st.cache_resource(show_spinner="Loading EfficientNetB0 model…")
def load_predictor() -> Predictor:
    import torch

    device = "cuda" if torch.cuda.is_available() else "cpu"
    predictor = Predictor(device=device)
    predictor._get(FINAL_MODEL_ID)  # eager load; raises ModelUnavailable if checkpoint is bad
    return predictor


def read_image(uploaded) -> Image.Image:
    """Decode an upload exactly like the training pipeline (EXIF-aware, RGB)."""
    with Image.open(uploaded) as im:
        im.load()
        return ImageOps.exif_transpose(im).convert("RGB")


# --------------------------------------------------------------------------- #
# Hero
# --------------------------------------------------------------------------- #
st.markdown(
    """
<div class="hero">
  <span class="badge">🛰️ AI-Powered Railway Inspection</span>
  <h1>🚆 RailGuard AI</h1>
  <p class="sub">Deep Learning-Based Railway Track Defect Detection</p>
  <p class="desc">Upload a railway track photograph and RailGuard AI classifies it into one of five
  categories: <b>Broken Track</b>, <b>Loose Bolts</b>, <b>Missing Parts</b>, <b>Rust</b> or
  <b>Normal Track</b>, using a fine-tuned EfficientNetB0 deep learning model.</p>
</div>
""",
    unsafe_allow_html=True,
)

chips = "".join(
    f'<div class="chip"><div class="i">{i}</div><div class="n">{n}</div><div class="d">{d}</div></div>'
    for i, n, d in CLASS_BLURBS
)
st.markdown(f'<div class="chips">{chips}</div>', unsafe_allow_html=True)

# --------------------------------------------------------------------------- #
# Upload + prediction
# --------------------------------------------------------------------------- #
st.markdown(
    '<div class="section-title"><span class="step">1</span>Upload a track image</div>'
    '<p class="section-sub">Drag and drop or browse. Supported formats: JPG, JPEG, PNG.</p>',
    unsafe_allow_html=True,
)

uploaded_file = st.file_uploader(
    "Drop a railway track image here",
    type=["jpg", "jpeg", "png"],
    label_visibility="collapsed",
)

image: Image.Image | None = None
if uploaded_file is not None:
    try:
        image = read_image(uploaded_file)
    except Exception:
        st.error("Unable to read this image. Please upload a valid JPG, JPEG or PNG file.")
        image = None

upload_key = f"{uploaded_file.name}:{uploaded_file.size}" if uploaded_file is not None else None

if image is not None:
    left, right = st.columns(2, gap="large")

    with left:
        st.markdown(
            '<div class="section-title" style="margin-top:.8rem">'
            '<span class="step">2</span>Image preview</div>',
            unsafe_allow_html=True,
        )
        st.image(image, use_container_width=True)
        st.caption(f"{uploaded_file.name} · {image.width} × {image.height} px")
        analyze = st.button("🔍 Analyze Image", type="primary", key="analyze")

    if analyze:
        try:
            predictor = load_predictor()
            with st.spinner("Analyzing with EfficientNetB0…"):
                result = predictor.predict(image=image, model_id=FINAL_MODEL_ID)
            st.session_state["rg_result"] = result
            st.session_state["rg_key"] = upload_key
        except ModelUnavailable as exc:
            st.session_state.pop("rg_result", None)
            st.error(f"The EfficientNetB0 model is unavailable: {exc}")
        except Exception:
            st.session_state.pop("rg_result", None)
            st.error("Prediction failed. Please try another image or check the server logs.")

    with right:
        st.markdown(
            '<div class="section-title" style="margin-top:.8rem">'
            '<span class="step">3</span>Prediction</div>',
            unsafe_allow_html=True,
        )
        result = st.session_state.get("rg_result")
        if result is None or st.session_state.get("rg_key") != upload_key:
            st.markdown(
                '<div class="glass placeholder"><div class="big">🔎</div>'
                '<p>Press <b>Analyze Image</b> to classify this track image '
                'with EfficientNetB0.</p></div>',
                unsafe_allow_html=True,
            )
        else:
            name = result["predicted_class"]
            style = CLASS_STYLES.get(
                name,
                {"icon": "🚆", "color": "#14b8a6", "bg": "rgba(20,184,166,.16)",
                 "status": "Result", "kind": "defect", "message": ""},
            )
            conf = max(0.0, min(1.0, float(result["confidence"])))
            warn_html = ""
            if result.get("low_confidence"):
                warn_html = (
                    '<div class="warn">⚠️ Low-confidence prediction. '
                    f"{html.escape(result.get('warning') or 'Have the track inspected by a qualified person.')}"
                    "</div>"
                )
            st.markdown(
                f"""
<div class="result" style="--rc:{style['color']};--rbg:{style['bg']}">
  <span class="status">{style['icon']} {html.escape(style['status'])}</span>
  <div class="cls">{html.escape(name)}</div>
  <div class="msg">{html.escape(style['message'])}</div>
  <div style="display:flex;justify-content:space-between;font-size:.9rem;margin-bottom:.35rem">
    <span>Model confidence for this image</span><b>{conf:.1%}</b>
  </div>
  <div class="bar"><span style="width:{conf*100:.1f}%"></span></div>
  <div class="meta">
    <span class="pill">🧠 Model: {FINAL_MODEL_NAME}</span>
    <span class="pill">⏱️ {result['inference_ms']:.1f} ms</span>
  </div>
  {warn_html}
</div>
""",
                unsafe_allow_html=True,
            )
            st.caption(
                "Confidence is the model's softmax score for this single image. "
                "It is not a guarantee that the prediction is correct."
            )
            with st.expander("View all class scores"):
                for cls_name, prob in sorted(
                    result["probabilities"].items(), key=lambda kv: kv[1], reverse=True
                ):
                    st.write(f"**{cls_name}** — {prob:.1%}")
                    st.progress(max(0.0, min(1.0, prob)))
else:
    st.markdown(
        '<div class="glass placeholder"><div class="big">📷</div>'
        "<p>No image uploaded yet. Add a railway track photo above to begin.</p></div>",
        unsafe_allow_html=True,
    )

# --------------------------------------------------------------------------- #
# About the model
# --------------------------------------------------------------------------- #
st.markdown(
    '<div class="section-title">About the Model</div>'
    '<p class="section-sub">Why EfficientNetB0 powers every prediction.</p>',
    unsafe_allow_html=True,
)
c1, c2 = st.columns([1.1, 1], gap="large")
with c1:
    st.markdown(
        f"""
<div class="glass">
  <h3>🧠 Final model: {FINAL_MODEL_NAME}</h3>
  <p>EfficientNetB0 was selected as the final deployment model because it achieved the highest test
  accuracy and macro F1-score among the compared models.</p>
  <ul>
    <li>ImageNet-pretrained transfer learning, fine-tuned for railway track images</li>
    <li>Five-class classification: Broken Track, Loose Bolts, Missing Parts, Rust, Normal Track</li>
    <li>Input resized to {config.IMAGE_SIZE}×{config.IMAGE_SIZE} with ImageNet normalization</li>
  </ul>
</div>
""",
        unsafe_allow_html=True,
    )
with c2:
    st.markdown(
        f"""
<div class="glass">
  <h3>📊 Test-set evaluation</h3>
  <div class="metric-grid">
    <div class="metric"><div class="v">{TEST_ACCURACY}</div><div class="l">Test Accuracy</div></div>
    <div class="metric"><div class="v">{TEST_MACRO_F1}</div><div class="l">Macro F1-score</div></div>
  </div>
  <div class="note">These metrics describe performance on the held-out test set. They are different
  from the confidence shown for a single uploaded image, which is only that image's model score.</div>
</div>
""",
        unsafe_allow_html=True,
    )

# --------------------------------------------------------------------------- #
# About RailGuard AI
# --------------------------------------------------------------------------- #
st.markdown('<div class="section-title">About RailGuard AI</div>', unsafe_allow_html=True)
st.markdown(
    """
<div class="glass">
  <p>RailGuard AI is a deep learning-based railway track defect classification system designed to assist
  railway inspection by identifying visible track conditions from uploaded images.</p>
  <p>It recognizes five categories: <b>Broken Track</b>, <b>Loose Bolts</b>, <b>Missing Parts</b>,
  <b>Rust</b> and <b>Normal Track</b>. It is a research prototype and does not replace physical
  railway safety inspection.</p>
</div>
""",
    unsafe_allow_html=True,
)

# --------------------------------------------------------------------------- #
# Footer
# --------------------------------------------------------------------------- #
st.markdown(
    f"""
<div class="footer">
  <b>🚆 RailGuard AI</b> · Final Year B.Tech Project<br>
  <a href="{GITHUB_URL}" target="_blank" rel="noopener">GitHub: Salma1612/RailGuard-AI</a>
</div>
""",
    unsafe_allow_html=True,
)
