// script.js - VERSÃO COMPLETA PRO
const el = id => document.getElementById(id);
const num = id => {const v = parseFloat(el(id).value); return Number.isFinite(v) && v >= 0 ? v : 0;};
const brl = v => v.toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
const debounce = (f, w) => {let t; return (...a) => {clearTimeout(t); t = setTimeout(() => f(...a), w);};};

const showToast = (msg, type = 'success') => {
  const toast = el('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
};

// ========== CONSTANTES ==========
const STORAGE_KEY = 'calc3d_pro';
const HISTORICO_KEY = 'calc3d_historico';
const REC = {peso:80, precoKg:120, margem:40, custoHora:2.00, tempoHoras:6, tempoMinutos:0};

// TEMPLATES PRÉ-DEFINIDOS
const TEMPLATES = {
  miniatura: {peso:50, precoKg:150, margem:45, custoHora:2.5, tempoHoras:8, tempoMinutos:0},
  funcional: {peso:120, precoKg:100, margem:35, custoHora:2.0, tempoHoras:12, tempoMinutos:30},
  presente: {peso:80, precoKg:130, margem:50, custoHora:2.0, tempoHoras:6, tempoMinutos:0},
  industrial: {peso:300, precoKg:90, margem:30, custoHora:3.0, tempoHoras:24, tempoMinutos:0}
};

// ========== ESTADO ==========
let modo = "basico", lastCalc = {custoTotal:0, custoFilamento:0, custoMaquina:0};
let grafico = null;

// ========== TABS ==========
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelector(`[data-content="${tab}"]`).classList.add('active');
    if(tab === 'historico') carregarHistorico();
  });
});

// ========== TEMPLATES ==========
document.querySelectorAll('.template-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const t = TEMPLATES[btn.dataset.template];
    if(!t) return;
    el('peso').value = t.peso;
    el('precoKg').value = t.precoKg;
    el('margem').value = t.margem;
    el('custoHora').value = t.custoHora.toFixed(2);
    el('tempoHoras').value = t.tempoHoras;
    el('tempoMinutos').value = String(t.tempoMinutos).padStart(2,'0');
    showToast(`✅ Template "${btn.textContent.trim()}" aplicado!`, 'success');
    calcular();
  });
});

// ========== TEMPO ==========
function initTempo() {
  const hS = el("tempoHoras"), mS = el("tempoMinutos");
  hS.innerHTML = ""; mS.innerHTML = "";
  for(let h = 0; h <= 24; h++) {
    const o = document.createElement("option");
    o.value = h; o.textContent = `${h}h`;
    hS.appendChild(o);
  }
  for(let m = 0; m < 60; m++) {
    const o = document.createElement("option");
    o.value = m; o.textContent = `${String(m).padStart(2,"0")}m`;
    mS.appendChild(o);
  }
  el("tempoHoras").value = String(REC.tempoHoras);
  el("tempoMinutos").value = String(REC.tempoMinutos).padStart(2,"0");
}

function tempoEmHorasFromSelects() {
  return (parseInt(el("tempoHoras").value, 10) || 0) + ((parseInt(el("tempoMinutos").value, 10) || 0) / 60);
}

// ========== MODO ==========
function setModo(n) {
  modo = n;
  const adv = el("advanced"), isAdv = modo === "avancado";
  adv.classList.toggle("is-open", isAdv);
  el("btnBasico").classList.toggle("active", modo === "basico");
  el("btnAvancado").classList.toggle("active", isAdv);
  calcular();
}

el("btnBasico").addEventListener("click", () => setModo("basico"));
el("btnAvancado").addEventListener("click", () => setModo("avancado"));

// ========== VALIDAÇÃO + ALERTAS ==========
function validar() {
  const p = num("peso"), pk = num("precoKg"), m = num("margem");
  if(p <= 0) {showToast('⚠️ Peso > 0', 'error'); return false;}
  if(pk <= 0) {showToast('⚠️ Preço > 0', 'error'); return false;}
  if(m < 0 || m >= 100) {showToast('⚠️ Margem 0-99%', 'error'); return false;}
  
  // Alertas inteligentes
  const alertaM = el('alertaMargem');
  if(m < 20) {
    alertaM.innerHTML = '⚠️ Margem muito baixa! Risco de prejuízo.';
    alertaM.className = 'alerta danger';
    alertaM.style.display = 'block';
  } else if(m > 60) {
    alertaM.innerHTML = '⚠️ Margem muito alta! Pode perder vendas.';
    alertaM.className = 'alerta warning';
    alertaM.style.display = 'block';
  } else {
    alertaM.style.display = 'none';
  }
  
  return true;
}

// ========== CÁLCULO PRINCIPAL ==========
function calcular() {
  if(!validar()) return;
  const p = num("peso"), pk = num("precoKg"), m = num("margem") / 100;
  const cf = (p / 1000) * pk;
  el("outCustoFilamento").textContent = brl(cf);
  let ct = cf, cm = 0;
  if(modo === "avancado") {
    cm = tempoEmHorasFromSelects() * num("custoHora");
    ct += cm;
    el("outCustoMaquina").textContent = brl(cm);
  } else {
    el("outCustoMaquina").textContent = "—";
  }
  const ps = (1 - m) <= 0 ? Infinity : (ct / (1 - m));
  el("outCusto").textContent = brl(ct);
  el("outPreco").textContent = ps === Infinity ? "Margem inválida" : brl(ps);
  lastCalc = {custoTotal:ct, custoFilamento:cf, custoMaquina:cm};
  
  atualizarLucro();
  atualizarGrafico();
  atualizarModoCliente();
  verificarAlertas();
}

const calcularD = debounce(calcular, 300);

// ========== LUCRO ==========
function atualizarLucro() {
  const lE = el("outLucro");
  if(el("outCusto").textContent === "—") {
    lE.textContent = "—";
    lE.classList.remove("lucro-positivo", "lucro-negativo", "lucro-zero");
    return;
  }
  const ct = lastCalc.custoTotal ?? 0, pf = Math.max(0, num("precoFinal")), l = pf - ct;
  lE.textContent = brl(l);
  lE.classList.remove("lucro-positivo", "lucro-negativo", "lucro-zero");
  if(l > 0.01) lE.classList.add("lucro-positivo");
  else if(l < -0.01) lE.classList.add("lucro-negativo");
  else lE.classList.add("lucro-zero");
}

// ========== ALERTAS INTELIGENTES ==========
function verificarAlertas() {
  const pf = num('precoFinal'), ct = lastCalc.custoTotal;
  const alertaP = el('alertaPreco');
  
  if(pf > 0 && pf < ct) {
    alertaP.innerHTML = '🚨 Preço abaixo do custo! Você terá prejuízo!';
    alertaP.className = 'alerta danger';
    alertaP.style.display = 'block';
  } else if(pf > ct * 2) {
    alertaP.innerHTML = '💡 Preço muito acima do mercado. Verifique concorrência.';
    alertaP.className = 'alerta warning';
    alertaP.style.display = 'block';
  } else {
    alertaP.style.display = 'none';
  }
}

// ========== GRÁFICO ==========
function atualizarGrafico() {
  const canvas = el('graficoPizza');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const cf = lastCalc.custoFilamento || 0;
  const cm = lastCalc.custoMaquina || 0;
  const pf = num('precoFinal');
  const lucro = pf > 0 ? pf - lastCalc.custoTotal : 0;
  
  if(grafico) grafico.destroy();
  
  if(pf === 0) {
    grafico = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Filamento', 'Máquina'],
        datasets: [{
          data: [cf, cm],
          backgroundColor: ['#f5c542', '#ff8c42']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {labels: {color: '#e8eaf0'}},
          title: {display: true, text: 'Composição do Custo', color: '#e8eaf0'}
        }
      }
    });
  } else {
    grafico = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Filamento', 'Máquina', 'Lucro'],
        datasets: [{
          data: [cf, cm, lucro > 0 ? lucro : 0],
          backgroundColor: ['#f5c542', '#ff8c42', lucro > 0 ? '#5ac878' : '#ff5c5c']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {labels: {color: '#e8eaf0'}},
          title: {display: true, text: 'Distribuição do Preço', color: '#e8eaf0'}
        }
      }
    });
  }
}

// ========== MODO CLIENTE ==========
function atualizarModoCliente() {
  const cf = lastCalc.custoFilamento || 0;
  const cm = lastCalc.custoMaquina || 0;
  const maoObra = cf * 0.2; // 20% do material como mão de obra
  const total = cf + cm + maoObra;
  
  el('clienteFilamento').textContent = brl(cf);
  el('clienteMaquina').textContent = brl(cm);
  el('clienteMaoObra').textContent = brl(maoObra);
  el('clienteTotal').textContent = brl(total);
}

// ========== COMPARAÇÃO ==========
el('btnCompararAgora')?.addEventListener('click', () => {
  const ct = lastCalc.custoTotal || 0;
  
  ['A', 'B', 'C'].forEach(c => {
    const m = num(`margem${c}`) / 100;
    const preco = ct / (1 - m);
    const lucro = preco - ct;
    el(`preco${c}`).textContent = brl(preco);
    el(`lucro${c}`).textContent = brl(lucro);
  });
  
  showToast('✅ Comparação atualizada!', 'success');
});

// ========== HISTÓRICO ==========
function salvarNoHistorico(nome) {
  const hist = JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]');
  const item = {
    id: Date.now(),
    nome: nome || 'Sem nome',
    data: new Date().toLocaleString('pt-BR'),
    peso: num('peso'),
    precoKg: num('precoKg'),
    margem: num('margem'),
    custoTotal: lastCalc.custoTotal,
    precoSugerido: lastCalc.custoTotal / (1 - num('margem') / 100)
  };
  hist.unshift(item);
  if(hist.length > 10) hist.pop();
  localStorage.setItem(HISTORICO_KEY, JSON.stringify(hist));
  showToast('💾 Salvo no histórico!', 'success');
  carregarHistorico();
}

function carregarHistorico() {
  const hist = JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]');
  const lista = el('listaHistorico');
  if(hist.length === 0) {
    lista.innerHTML = '<div class="empty-state">Nenhum cálculo salvo ainda.</div>';
    return;
  }
  lista.innerHTML = hist.map(h => `
    <div class="historico-item">
      <div>
        <div class="historico-nome">${h.nome}</div>
        <div class="historico-data">${h.data}</div>
      </div>
      <div class="historico-valor">${brl(h.precoSugerido)}</div>
      <div class="historico-acoes">
        <button class="btn btn-pequeno" onclick="carregarDoHistorico(${h.id})">📥 Carregar</button>
        <button class="btn btn-pequeno" onclick="excluirDoHistorico(${h.id})">🗑️</button>
      </div>
    </div>
  `).join('');
}

window.carregarDoHistorico = (id) => {
  const hist = JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]');
  const item = hist.find(h => h.id === id);
  if(!item) return;
  el('peso').value = item.peso;
  el('precoKg').value = item.precoKg;
  el('margem').value = item.margem;
  calcular();
  document.querySelector('[data-tab="calculadora"]').click();
  showToast('📥 Cálculo carregado!', 'success');
};

window.excluirDoHistorico = (id) => {
  let hist = JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]');
  hist = hist.filter(h => h.id !== id);
  localStorage.setItem(HISTORICO_KEY, JSON.stringify(hist));
  carregarHistorico();
  showToast('🗑️ Excluído!', 'success');
};

// ========== EXPORTAR CSV ==========
el('btnExportarCSV')?.addEventListener('click', () => {
  const hist = JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]');
  if(hist.length === 0) return showToast('Nenhum dado para exportar', 'error');
  
  let csv = 'Nome,Data,Peso(g),Preço/kg,Margem(%),Custo Total,Preço Sugerido\n';
  hist.forEach(h => {
    csv += `"${h.nome}","${h.data}",${h.peso},${h.precoKg},${h.margem},${h.custoTotal.toFixed(2)},${h.precoSugerido.toFixed(2)}\n`;
  });
  
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `historico_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  showToast('📑 CSV exportado!', 'success');
});

// ========== CALCULADORA DE CUSTO/HORA ==========
el('btnCalcCusto')?.addEventListener('click', () => {
  el('modalCalcCusto').classList.add('show');
  calcularCustoHora();
});

function calcularCustoHora() {
  const consumo = num('consumoW') / 1000;
  const kwh = num('precoKwh');
  const deprec = num('depreciacaoHora');
  const tempo = num('tempoMonitora');
  const custoEnergia = consumo * kwh;
  const total = custoEnergia + deprec + tempo;
  el('custoCalculado').textContent = brl(total);
}

['consumoW', 'precoKwh', 'depreciacaoHora', 'tempoMonitora'].forEach(id => {
  el(id)?.addEventListener('input', calcularCustoHora);
});

el('btnAplicarCusto')?.addEventListener('click', () => {
  const total = parseFloat(el('custoCalculado').textContent.replace(/[^\d,]/g, '').replace(',', '.'));
  el('custoHora').value = total.toFixed(2);
  el('modalCalcCusto').classList.remove('show');
  showToast('✅ Custo/hora aplicado!', 'success');
  calcular();
});

// ========== SALVAR NO HISTÓRICO (MODAL) ==========
el('btnSalvarCalculo')?.addEventListener('click', () => {
  if(lastCalc.custoTotal === 0) return showToast('Calcule primeiro!', 'error');
  el('modalSalvarHistorico').classList.add('show');
  el('nomeCalculo').value = '';
  el('nomeCalculo').focus();
});

el('btnConfirmarSalvar')?.addEventListener('click', () => {
  const nome = el('nomeCalculo').value.trim() || 'Sem nome';
  salvarNoHistorico(nome);
  el('modalSalvarHistorico').classList.remove('show');
});

// ========== GERAR ORÇAMENTO CLIENTE PDF ==========
el('btnGerarOrcamento')?.addEventListener('click', () => {
  const nome = el('nomeCliente').value.trim() || 'Cliente';
  const projeto = el('nomeProjeto').value.trim() || 'Projeto';
  
  if(typeof window.jspdf === 'undefined') return showToast('❌ Erro PDF', 'error');
  
  const {jsPDF} = window.jspdf;
  const doc = new jsPDF();
  const mx = 20;
  let y = 20;
  
  doc.setFontSize(22); doc.setFont(undefined, 'bold');
  doc.text('ORÇAMENTO', mx, y);
  y += 15;
  
  doc.setFontSize(12); doc.setFont(undefined, 'normal');
  doc.text(`Cliente: ${nome}`, mx, y); y += 8;
  doc.text(`Projeto: ${projeto}`, mx, y); y += 8;
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, mx, y); y += 15;
  
  doc.setDrawColor(77, 108, 255); doc.setLineWidth(0.5); doc.line(mx, y, mx + 170, y); y += 10;
  
  doc.setFontSize(14); doc.setFont(undefined, 'bold');
  doc.text('DETALHAMENTO', mx, y); y += 10;
  
  doc.setFontSize(11); doc.setFont(undefined, 'normal');
  const cf = lastCalc.custoFilamento || 0;
  const cm = lastCalc.custoMaquina || 0;
  const mo = cf * 0.2;
  const total = cf + cm + mo;
  
  doc.text(`📦 Material (filamento): ${brl(cf)}`, mx + 5, y); y += 8;
  doc.text(`🖨️ Impressão (uso de máquina): ${brl(cm)}`, mx + 5, y); y += 8;
  doc.text(`👨‍💼 Mão de obra (modelagem/ajustes): ${brl(mo)}`, mx + 5, y); y += 12;
  
  doc.setFontSize(16); doc.setFont(undefined, 'bold');
  doc.text(`TOTAL: ${brl(total)}`, mx + 5, y);
  
  y = 270; doc.setDrawColor(200); doc.setLineWidth(0.3); doc.line(mx, y, mx + 170, y); y += 5;
  doc.setFontSize(9); doc.setTextColor(150);
  doc.text('Orçamento gerado pela Calculadora PRO - Impressão 3D', mx, y);
  
  doc.save(`orcamento_${projeto.replace(/\s/g, '_')}.pdf`);
  showToast('📄 Orçamento gerado!', 'success');
});

// ========== MODAIS - FECHAR ==========
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    el(btn.dataset.close).classList.remove('show');
  });
});

document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', e => {
    if(e.target === modal) modal.classList.remove('show');
  });
});

// ========== LIMPAR E RESET ==========
function limpar() {
  ["peso", "precoKg", "margem", "precoFinal"].forEach(i => el(i).value = "0");
  el("tempoHoras").value = "0"; el("tempoMinutos").value = "00"; el("custoHora").value = "0.00";
  ["outCustoFilamento", "outCustoMaquina", "outCusto", "outPreco", "outLucro"].forEach(i => el(i).textContent = "—");
  el("outLucro").classList.remove("lucro-positivo", "lucro-negativo", "lucro-zero");
  lastCalc = {custoTotal:0, custoFilamento:0, custoMaquina:0};
  if(grafico) {grafico.destroy(); grafico = null;}
  showToast('🗑️ Limpo', 'success');
}

function resetar() {
  el("peso").value = String(REC.peso); el("precoKg").value = String(REC.precoKg);
  el("margem").value = String(REC.margem); el("custoHora").value = REC.custoHora.toFixed(2);
  el("tempoHoras").value = String(REC.tempoHoras);
  el("tempoMinutos").value = String(REC.tempoMinutos).padStart(2,"0");
  calcular();
  showToast('🔄 Resetado', 'success');
}

el("btnLimpar").addEventListener("click", limpar);
el("btnRecomendado").addEventListener("click", resetar);
el("btnCalcular").addEventListener("click", e => {e.preventDefault(); calcular();});
el("calcForm").addEventListener("submit", e => {e.preventDefault(); calcular();});

// ========== AUTO-CALCULAR ==========
["peso", "precoKg", "margem", "tempoHoras", "tempoMinutos", "custoHora", "precoFinal"].forEach(id => {
  el(id)?.addEventListener("input", calcularD);
});

// ========== INIT ==========
function init() {
  initTempo();
  setModo("basico");
  resetar();
  console.log('✅ CALCULADORA PRO INICIALIZADA');
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

