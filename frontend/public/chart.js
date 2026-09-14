// frontend/public/chart.js
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Lightweight Canvas charting engine for Hikari NAV & Yield analytics.

class HikariYieldChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.timeframe = "30D";

    this.initData();
    this.setupResize();
    this.setupThemeWatcher();
    this.render();
  }

  initData() {
    this.datasets = {
      "1D": [
        { label: "00:00", nav: 1.0421, apy: 7.2 },
        { label: "04:00", nav: 1.0423, apy: 7.2 },
        { label: "08:00", nav: 1.0424, apy: 7.3 },
        { label: "12:00", nav: 1.0426, apy: 7.4 },
        { label: "16:00", nav: 1.0427, apy: 7.4 },
        { label: "20:00", nav: 1.0428, apy: 7.4 },
      ],
      "7D": [
        { label: "Mon", nav: 1.0375, apy: 6.8 },
        { label: "Tue", nav: 1.0384, apy: 6.9 },
        { label: "Wed", nav: 1.0395, apy: 7.1 },
        { label: "Thu", nav: 1.0402, apy: 7.0 },
        { label: "Fri", nav: 1.0411, apy: 7.2 },
        { label: "Sat", nav: 1.0420, apy: 7.3 },
        { label: "Sun", nav: 1.0428, apy: 7.4 },
      ],
      "1W": [
        { label: "Mon", nav: 1.0375, apy: 6.8 },
        { label: "Tue", nav: 1.0384, apy: 6.9 },
        { label: "Wed", nav: 1.0395, apy: 7.1 },
        { label: "Thu", nav: 1.0402, apy: 7.0 },
        { label: "Fri", nav: 1.0411, apy: 7.2 },
        { label: "Sat", nav: 1.0420, apy: 7.3 },
        { label: "Sun", nav: 1.0428, apy: 7.4 },
      ],
      "30D": [
        { label: "Week 1", nav: 1.0120, apy: 6.2 },
        { label: "Week 2", nav: 1.0215, apy: 6.5 },
        { label: "Week 3", nav: 1.0310, apy: 6.9 },
        { label: "Week 4", nav: 1.0428, apy: 7.4 },
      ],
      "1M": [
        { label: "Week 1", nav: 1.0120, apy: 6.2 },
        { label: "Week 2", nav: 1.0215, apy: 6.5 },
        { label: "Week 3", nav: 1.0310, apy: 6.9 },
        { label: "Week 4", nav: 1.0428, apy: 7.4 },
      ],
      "90D": [
        { label: "Month 1", nav: 1.0080, apy: 6.1 },
        { label: "Month 2", nav: 1.0250, apy: 6.8 },
        { label: "Month 3", nav: 1.0428, apy: 7.4 },
      ],
      "1Y": [
        { label: "Q1", nav: 1.0000, apy: 5.8 },
        { label: "Q2", nav: 1.0150, apy: 6.4 },
        { label: "Q3", nav: 1.0290, apy: 7.0 },
        { label: "Q4", nav: 1.0428, apy: 7.4 },
      ],
    };
  }

  setTimeframe(tf) {
    if (this.datasets[tf]) {
      this.timeframe = tf;
      this.render();
    } else if (tf === "7D" && this.datasets["1W"]) {
      this.timeframe = "1W";
      this.render();
    } else if (tf === "30D" && this.datasets["1M"]) {
      this.timeframe = "1M";
      this.render();
    }
  }

  setupResize() {
    const handleResize = () => {
      this.render();
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("load", handleResize);
    if (this.canvas && this.canvas.parentElement && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        this.render();
      });
      ro.observe(this.canvas.parentElement);
    }
  }

  setupThemeWatcher() {
    const observer = new MutationObserver(() => {
      this.render();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  render() {
    if (!this.canvas || !this.ctx) return;

    // Handle high DPI displays
    const rect = this.canvas.getBoundingClientRect();
    const parentRect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : null;
    const dpr = window.devicePixelRatio || 1;
    const isLight = document.documentElement.getAttribute("data-theme") === "light";

    const width = Math.max(
      280,
      (rect && rect.width > 0 ? rect.width : 0) ||
      (parentRect && parentRect.width > 0 ? parentRect.width : 0) ||
      (this.canvas.parentElement ? this.canvas.parentElement.clientWidth : 0) ||
      (this.canvas.parentElement ? this.canvas.parentElement.offsetWidth : 0) ||
      600
    );
    const height = Math.max(
      180,
      (rect && rect.height > 0 ? rect.height : 0) ||
      (parentRect && parentRect.height > 0 ? parentRect.height : 0) ||
      (this.canvas.parentElement ? this.canvas.parentElement.clientHeight : 0) ||
      210
    );

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = width + "px";
    this.canvas.style.height = height + "px";

    if (this.ctx.resetTransform) {
      this.ctx.resetTransform();
    } else {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    this.ctx.scale(dpr, dpr);

    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);

    const data = this.datasets[this.timeframe] || this.datasets["30D"] || this.datasets["1M"];
    const padding = { top: 25, right: 25, bottom: 35, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const minNav = 0.995;
    const maxNav = 1.055;

    // 1. Draw horizontal gridlines
    ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    ctx.font = "600 11px 'Instrument Sans', sans-serif";
    ctx.fillStyle = isLight ? "#475569" : "#cbd5e1";
    ctx.textAlign = "right";

    for (let i = 0; i <= 4; i++) {
      const yVal = minNav + ((maxNav - minNav) * i) / 4;
      const yPos = padding.top + chartH - (i * chartH) / 4;

      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(padding.left + chartW, yPos);
      ctx.stroke();

      ctx.fillText(`${yVal.toFixed(3)} XLM`, padding.left - 8, yPos + 4);
    }

    // 2. Draw NAV curve points
    const points = data.map((d, idx) => {
      const x = padding.left + (idx * chartW) / (data.length - 1);
      const y = padding.top + chartH - ((d.nav - minNav) / (maxNav - minNav)) * chartH;
      return { x, y, label: d.label, nav: d.nav };
    });

    // Fill area under curve with violet/lavender gradient
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    if (isLight) {
      gradient.addColorStop(0, "rgba(124, 58, 237, 0.22)");
      gradient.addColorStop(0.6, "rgba(139, 47, 230, 0.08)");
      gradient.addColorStop(1, "rgba(124, 58, 237, 0.0)");
    } else {
      gradient.addColorStop(0, "rgba(139, 47, 230, 0.42)");
      gradient.addColorStop(0.6, "rgba(192, 132, 252, 0.12)");
      gradient.addColorStop(1, "rgba(139, 47, 230, 0.0)");
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartH);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Stroke curve in vibrant violet / lavender
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = isLight ? "#7c3aed" : "#c084fc";
    ctx.lineWidth = 3;
    ctx.shadowColor = isLight ? "rgba(124, 58, 237, 0.35)" : "rgba(192, 132, 252, 0.6)";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Draw points & X-axis labels
    ctx.textAlign = "center";
    points.forEach((p) => {
      // Glow dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = isLight ? "#7c3aed" : "#e9d5ff";
      ctx.fill();
      ctx.strokeStyle = isLight ? "#ffffff" : "#8b2fe6";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label below
      ctx.fillStyle = isLight ? "#334155" : "rgba(233, 213, 255, 0.85)";
      ctx.font = "600 11px 'Instrument Sans', sans-serif";
      ctx.fillText(p.label, p.x, height - 10);
    });
  }
}

window.HikariYieldChart = HikariYieldChart;
