/* =====================================================
   FINANCE CONTROL SYSTEM — app.js
   Auth + Storage: Supabase
   ===================================================== */

// ─── 1. CONFIGURAÇÕES E ESTADO GLOBAL ─────────────────
const SUPABASE_URL = 'https://dbljvtkfsemexvyyotjl.supabase.co';
const SUPABASE_ANON = 'sb_publishable_G34ZFZbMO8faTziAk11sPw_knlEyQtw';
const TABELA = 'gastos';

let tokenSessao = null;
let historico = [];
let historicoGanhos = [];
let idRemover = null;
let idRemoverGanho = null;
let idEditar = null;
let limiteMensal = 0;

const headersBase = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON,
};

function headersAuth() {
  return { ...headersBase, 'Authorization': `Bearer ${tokenSessao}` };
}

// ─── 2. AUTENTICAÇÃO E SESSÃO ─────────────────────────
function trocarAba(aba, btn) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('form-' + aba).classList.add('active');
  limparErrosAuth();
}

function limparErrosAuth() {
  ['err-login-email', 'err-login-senha', 'err-login-geral', 'err-reg-email', 'err-reg-senha', 'err-reg-confirma', 'err-reg-geral']
    .forEach(id => setError(id, ''));
}

async function fazerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;

  let valido = true;
  if (!email) { setError('err-login-email', 'Informe seu e-mail.'); valido = false; }
  if (!senha) { setError('err-login-senha', 'Informe sua senha.'); valido = false; }
  if (!valido) return;

  setBloqueadoAuth(true);
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: headersBase, body: JSON.stringify({ email, password: senha }),
    });
    const dados = await res.json();
    if (!res.ok) throw new Error(dados.error_description || dados.msg || 'E-mail ou senha incorretos.');
    tokenSessao = dados.access_token;
    entrarNoApp(dados.user.email);
  } catch (err) {
    setError('err-login-geral', err.message || 'Erro de conexão.');
  } finally {
    setBloqueadoAuth(false);
  }
}

async function fazerCadastro() {
  const email = document.getElementById('reg-email').value.trim();
  const senha = document.getElementById('reg-senha').value;
  const confirma = document.getElementById('reg-confirma').value;

  let valido = true;
  if (!email) { setError('err-reg-email', 'Informe um e-mail.'); valido = false; }
  if (senha.length < 6) { setError('err-reg-senha', 'Mínimo 6 caracteres.'); valido = false; }
  if (senha !== confirma) { setError('err-reg-confirma', 'As senhas não coincidem.'); valido = false; }
  if (!valido) return;

  setBloqueadoAuth(true);
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST', headers: headersBase, body: JSON.stringify({ email, password: senha }),
    });
    const dados = await res.json();
    if (!res.ok) throw new Error(dados.error_description || dados.msg || 'Erro ao criar conta.');

    if (dados.access_token) {
      tokenSessao = dados.access_token;
      entrarNoApp(dados.user.email);
    } else {
      const msgGeral = document.getElementById('err-reg-geral');
      msgGeral.style.color = 'var(--success)';
      msgGeral.textContent = '✔ Conta criada! Verifique seu e-mail para confirmar.';
    }
  } catch (err) {
    setError('err-reg-geral', err.message || 'Erro de conexão.');
  } finally {
    setBloqueadoAuth(false);
  }
}

async function fazerLogout() {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: 'POST', headers: headersAuth() });
  } catch { /* ignora */ }

  tokenSessao = null; historico = []; historicoGanhos = [];
  document.getElementById('tela-app').style.display = 'none';
  document.getElementById('tela-auth').style.display = 'flex';
  ['login-email', 'login-senha'].forEach(id => document.getElementById(id).value = '');
}

async function entrarNoApp(email) {
  document.getElementById('tela-auth').style.display = 'none';
  document.getElementById('tela-app').style.display = 'block';
  document.getElementById('user-email-display').textContent = email;
  carregarLimiteSalvo();

  ['stat-total', 'stat-max'].forEach(id => document.getElementById(id).textContent = 'R$ ...');
  document.getElementById('stat-count').textContent = '...';

  const resultados = await Promise.allSettled([dbBuscarTodos(), dbBuscarGanhos()]);
  historico      = (resultados[0].status === 'fulfilled' && Array.isArray(resultados[0].value)) ? resultados[0].value.filter(g => g && g.id != null) : [];
  historicoGanhos = (resultados[1].status === 'fulfilled' && Array.isArray(resultados[1].value)) ? resultados[1].value.filter(g => g && g.id != null) : [];
  if (resultados.some(r => r.status === 'rejected')) showToast('Aviso: alguns dados não carregaram.', 'danger');
  atualizarStats();
}

// ─── 3. BANCO DE DADOS (SUPABASE) ─────────────────────
async function dbBuscarTodos() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABELA}?select=*&order=id.asc`, { headers: headersAuth() });
  if (!res.ok) throw new Error('Erro ao buscar gastos.');
  return res.json();
}

async function dbInserir(gasto) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABELA}`, {
    method: 'POST', headers: { ...headersAuth(), 'Prefer': 'return=representation' }, body: JSON.stringify(gasto),
  });
  if (!res.ok) throw new Error('Erro ao cadastrar gasto.');
  const dados = await res.json();
  return dados[0];
}

async function dbRemover(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABELA}?id=eq.${id}`, { method: 'DELETE', headers: headersAuth() });
  if (!res.ok) throw new Error('Erro ao remover gasto.');
}

async function dbAtualizar(id, dados) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABELA}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...headersAuth(), 'Prefer': 'return=representation' },
    body: JSON.stringify(dados),
  });
  if (!res.ok) {
    const msg = await res.text();
    console.error('dbAtualizar falhou:', res.status, msg);
    throw new Error('Erro ao atualizar gasto.');
  }
  const resultado = await res.json();
  return resultado[0];
}

async function dbBuscarGanhos() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ganhos?select=*&order=id.asc`, { headers: headersAuth() });
  if (!res.ok) throw new Error('Erro ao buscar ganhos.');
  return res.json();
}

async function dbInserirGanho(ganho) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ganhos`, {
    method: 'POST', headers: { ...headersAuth(), 'Prefer': 'return=representation' }, body: JSON.stringify(ganho),
  });
  if (!res.ok) throw new Error('Erro ao cadastrar ganho.');
  const dados = await res.json();
  return dados[0];
}

async function dbRemoverGanho(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ganhos?id=eq.${id}`, { method: 'DELETE', headers: headersAuth() });
  if (!res.ok) throw new Error('Erro ao remover ganho.');
}

// ─── 4. LÓGICA DE GASTOS E GANHOS ─────────────────────
async function salvarGasto() {
  const nome   = document.getElementById('inp-nome').value;
  const valor  = document.getElementById('inp-valor').value;
  const classe = document.getElementById('inp-classe').value;
  const data   = document.getElementById('inp-data').value;

  const erros = [validarNome(nome), validarValor(valor), validarClasse(classe), validarData(data)];
  ['err-nome', 'err-valor', 'err-classe', 'err-data'].forEach((id, i) => setError(id, erros[i]));
  if (erros.some(e => e !== '')) return;

  const [y, m, d] = data.split('-');
  const novoGasto = { nome: nome.trim(), valor: parseFloat(valor), classe: classe.trim(), data: `${d}/${m}/${y}` };

  setBloqueadoFormulario(true);
  try {
    const registrado = await dbInserir(novoGasto);
    historico.push(registrado);
    atualizarStats();
    ['inp-nome', 'inp-valor', 'inp-data'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('inp-classe').value = '';
    showToast(`✔ "${nome.trim()}" cadastrado!`, 'success');
  } catch {
    showToast('Erro ao salvar.', 'danger');
  } finally {
    setBloqueadoFormulario(false);
  }
}

async function salvarGanho() {
  const nome   = document.getElementById('ganho-nome').value;
  const valor  = document.getElementById('ganho-valor').value;
  const classe = document.getElementById('ganho-classe').value;
  const data   = document.getElementById('ganho-data').value;
  const fixo   = document.getElementById('ganho-fixo').checked;

  const erros = [validarNome(nome), validarValor(valor), validarClasse(classe), validarData(data)];
  ['err-ganho-nome', 'err-ganho-valor', 'err-ganho-classe', 'err-ganho-data'].forEach((id, i) => setError(id, erros[i]));
  if (erros.some(e => e !== '')) return;

  const [y, m, d] = data.split('-');
  const novoGanho = { nome: nome.trim(), valor: parseFloat(valor), classe: classe.trim(), data: `${d}/${m}/${y}`, fixo };

  setBloqueadoFormulario(true);
  try {
    const registrado = await dbInserirGanho(novoGanho);
    historicoGanhos.push(registrado);
    atualizarStats();
    ['ganho-nome', 'ganho-valor', 'ganho-data'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('ganho-classe').value = '';
    document.getElementById('ganho-fixo').checked = false;
    showToast(`✔ "${nome.trim()}" cadastrado!`, 'success');
  } catch {
    showToast('Erro ao salvar ganho.', 'danger');
  } finally {
    setBloqueadoFormulario(false);
  }
}

async function confirmarRemocao() {
  const tipo = document.getElementById('modal-overlay').dataset.tipo;
  if (tipo === 'ganho') { await confirmarRemocaoGanho(); return; }

  if (idRemover === null) return;
  setBloqueadoFormulario(true);
  try {
    await dbRemover(idRemover);
    historico = historico.filter(g => g.id !== idRemover);
    fecharModal();
    renderListaRemover();
    atualizarStats();
    showToast('✔ Gasto removido!', 'danger');
  } catch {
    showToast('Erro ao remover.', 'danger'); fecharModal();
  } finally {
    setBloqueadoFormulario(false);
  }
}

async function confirmarRemocaoGanho() {
  if (idRemoverGanho === null) return;
  setBloqueadoFormulario(true);
  try {
    await dbRemoverGanho(idRemoverGanho);
    historicoGanhos = historicoGanhos.filter(g => g.id !== idRemoverGanho);
    idRemoverGanho = null;
    fecharModal();
    renderListaRemoverGanho();
    atualizarStats();
    showToast('✔ Ganho removido!', 'danger');
  } catch {
    showToast('Erro ao remover.', 'danger'); fecharModal();
  } finally {
    setBloqueadoFormulario(false);
  }
}

async function confirmarEdicao() {
  if (idEditar === null) return;

  const nome   = document.getElementById('edit-nome').value;
  const valor  = document.getElementById('edit-valor').value;
  const classe = document.getElementById('edit-classe').value;
  const data   = document.getElementById('edit-data').value;

  const erros = [validarNome(nome), validarValor(valor), validarClasse(classe), validarData(data)];
  ['err-edit-nome', 'err-edit-valor', 'err-edit-classe', 'err-edit-data'].forEach((id, i) => setError(id, erros[i]));
  if (erros.some(e => e !== '')) return;

  const [y, m, d] = data.split('-');
  const dados = { nome: nome.trim(), valor: parseFloat(valor), classe: classe.trim(), data: `${d}/${m}/${y}` };

  // Bloqueia só os botões do modal de edição, não o app inteiro
  const btnSalvar = document.querySelector('#modal-editar-overlay .btn-primary');
  const btnCancelar = document.querySelector('#modal-editar-overlay .btn-cancel');
  if (btnSalvar) btnSalvar.disabled = true;
  if (btnCancelar) btnCancelar.disabled = true;

  try {
    const atualizado = await dbAtualizar(idEditar, dados);
    const idx = historico.findIndex(g => g.id === idEditar);
    if (idx !== -1) historico[idx] = atualizado;
    fecharModalEditar();
    renderListaEditar();
    atualizarStats();
    showToast('✔ Atualizado com sucesso!', 'success');
  } catch {
    showToast('Erro ao atualizar.', 'danger');
  } finally {
    if (btnSalvar) btnSalvar.disabled = false;
    if (btnCancelar) btnCancelar.disabled = false;
  }
}

// ─── 5. STATS E RENDERIZAÇÃO ──────────────────────────
function atualizarStats() {
  const totalGastos  = historico.reduce((s, g) => s + Number(g.valor), 0);
  const totalGanhos  = historicoGanhos.reduce((s, g) => s + Number(g.valor), 0);
  const maxVal       = historico.length ? Math.max(...historico.map(g => Number(g.valor))) : 0;
  const balanco      = totalGanhos - totalGastos;

  document.getElementById('stat-total').textContent  = `R$ ${formatVal(totalGastos)}`;
  document.getElementById('stat-count').textContent  = historico.length;
  document.getElementById('stat-max').textContent    = `R$ ${formatVal(maxVal)}`;

  const cardTotal  = document.getElementById('stat-total').parentElement;
  const cardLimite = document.getElementById('card-limite');
  if (cardTotal)  cardTotal.classList.remove('alerta-atencao', 'alerta-critico');
  if (cardLimite) cardLimite.classList.remove('alerta-atencao', 'alerta-critico');

  if (limiteMensal > 0) {
    const p = (totalGastos / limiteMensal) * 100;
    if (p >= 100) {
      if (cardTotal)  cardTotal.classList.add('alerta-critico');
      if (cardLimite) cardLimite.classList.add('alerta-critico');
      showToast('⚠️ Limite de gastos excedido!', 'danger');
    } else if (p >= 80) {
      if (cardTotal)  cardTotal.classList.add('alerta-atencao');
      if (cardLimite) cardLimite.classList.add('alerta-atencao');
    }
  }

  const elBalanco = document.getElementById('stat-balanco');
  if (elBalanco) {
    elBalanco.textContent = `R$ ${formatVal(balanco)}`;
    elBalanco.style.color = balanco >= 0 ? 'var(--success)' : 'var(--danger)';
  }

  window.dispatchEvent(new Event('dadosAtualizados'));
}

function renderRelatorio() {
  if (typeof filtrarRelatorioPorCategoria === 'function') {
    filtrarRelatorioPorCategoria();
  }
}

function renderListaRemover() {
  const cont = document.getElementById('lista-remover');
  if (!cont) return;
  if (!historico.length) {
    cont.innerHTML = `<div class="empty-state"><div class="empty-icon">⬡</div><div class="empty-text">Nenhum gasto</div></div>`; return;
  }
  cont.innerHTML = historico.map(g => `
    <div class="report-card">
      <div class="report-row">
        <div><div class="report-name">${escHtml(g.nome)}</div><div class="report-meta">${escHtml(g.classe)} · ${g.data}</div></div>
        <div style="display:flex; align-items:center; gap:14px">
          <span class="val-cell">R$ ${formatVal(Number(g.valor))}</span>
          <button class="btn-remove" onclick="abrirModal(${g.id}, '${escHtml(g.nome)}')">✕ Remover</button>
        </div>
      </div>
    </div>`).join('');
}

function renderListaRemoverGanho() {
  const cont = document.getElementById('lista-remover-ganho');
  if (!cont) return;
  if (!historicoGanhos.length) {
    cont.innerHTML = `<div class="empty-state"><div class="empty-icon">⬡</div><div class="empty-text">Nenhum ganho</div></div>`; return;
  }
  cont.innerHTML = historicoGanhos.map(g => `
    <div class="report-card">
      <div class="report-row">
        <div><div class="report-name">${escHtml(g.nome)}</div><div class="report-meta">${escHtml(g.classe)} · ${g.data}</div></div>
        <div style="display:flex; align-items:center; gap:14px">
          <span class="val-cell val-ganho">R$ ${formatVal(Number(g.valor))}</span>
          <button class="btn-remove" onclick="abrirModalGanho(${g.id}, '${escHtml(g.nome)}')">✕ Remover</button>
        </div>
      </div>
    </div>`).join('');
}

function renderListaEditar() {
  const cont = document.getElementById('lista-editar');
  if (!cont) return;
  if (!historico.length) {
    cont.innerHTML = `<div class="empty-state"><div class="empty-icon">⬡</div><div class="empty-text">Nenhum gasto</div></div>`; return;
  }
  cont.innerHTML = historico.map(g => `
    <div class="report-card">
      <div class="report-row">
        <div><div class="report-name">${escHtml(g.nome)}</div><div class="report-meta">${escHtml(g.classe)} · ${g.data}</div></div>
        <div style="display:flex; align-items:center; gap:14px">
          <span class="val-cell">R$ ${formatVal(Number(g.valor))}</span>
          <button class="btn-edit" onclick="abrirModalEditar(${g.id})">✎ Editar</button>
        </div>
      </div>
    </div>`).join('');
}

// ─── 6. MODAIS ────────────────────────────────────────
function showView(view, btn) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  btn.classList.add('active');

  if (view === 'remover')       renderListaRemover();
  if (view === 'remover-ganho') renderListaRemoverGanho();
  if (view === 'editar')        renderListaEditar();
  if (view === 'relatorio')     renderRelatorio();
}

function abrirModal(id, nome) {
  idRemover = id;
  document.getElementById('modal-nome').textContent = nome;
  document.getElementById('modal-overlay').classList.add('open');
}

function abrirModalGanho(id, nome) {
  idRemoverGanho = id;
  document.getElementById('modal-nome').textContent = nome;
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('open');
  overlay.dataset.tipo = 'ganho';
}

function fecharModal() {
  idRemover = null; idRemoverGanho = null;
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('open');
  delete overlay.dataset.tipo;
}

function abrirModalEditar(id) {
  const g = historico.find(x => x && x.id === id);
  if (!g) return;
  idEditar = id;
  document.getElementById('edit-nome').value  = g.nome;
  document.getElementById('edit-valor').value = g.valor;
  document.getElementById('edit-classe').value = g.classe;
  const [d, m, y] = g.data.split('/');
  document.getElementById('edit-data').value = `${y}-${m}-${d}`;
  ['err-edit-nome', 'err-edit-valor', 'err-edit-classe', 'err-edit-data'].forEach(id => setError(id, ''));
  document.getElementById('modal-editar-overlay').classList.add('open');
}

function fecharModalEditar() {
  idEditar = null;
  document.getElementById('modal-editar-overlay').classList.remove('open');
}

// ─── 7. LIMITE MENSAL ─────────────────────────────────
function carregarLimiteSalvo() {
  const email = document.getElementById('user-email-display').textContent;
  const salvo = localStorage.getItem(`limite_${email}`);
  limiteMensal = salvo ? parseFloat(salvo) : 0;

  const inp = document.getElementById('inp-limite');
  if (inp) inp.value = limiteMensal > 0 ? limiteMensal : '';

  const el = document.getElementById('stat-limite');
  if (el) el.textContent = `R$ ${formatVal(limiteMensal)}`;
}

function salvarLimiteMensal() {
  const inp = document.getElementById('inp-limite');
  if (!inp) { showToast('Campo de limite não encontrado.', 'danger'); return; }

  const val = parseFloat(inp.value);
  if (inp.value === '' || isNaN(val) || val < 0) {
    showToast('Informe um valor válido para o limite.', 'danger'); return;
  }

  const email = document.getElementById('user-email-display').textContent;
  limiteMensal = val;
  localStorage.setItem(`limite_${email}`, limiteMensal);

  const el = document.getElementById('stat-limite');
  if (el) el.textContent = `R$ ${formatVal(limiteMensal)}`;
  atualizarStats();
  showToast('✔ Limite salvo!', 'success');
}

// ─── 8. UTILITÁRIOS ───────────────────────────────────
function validarNome(v)   { return (!v || v.trim().length === 0) ? 'Informe um nome.' : (/^\d+$/.test(v.trim()) ? 'Apenas números não é válido.' : ''); }
function validarValor(v)  { const n = parseFloat(v); return (isNaN(n) || n <= 0) ? 'Valor inválido.' : ''; }
function validarClasse(v) { return (!v || v.trim().length === 0) ? 'Informe a categoria.' : ''; }
function validarData(v)   { return !v ? 'Selecione a data.' : ''; }
function setError(id, msg){ const el = document.getElementById(id); if (el) el.textContent = msg; }
function formatVal(n)     { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function escHtml(s)       { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// Bloqueia apenas os formulários de cadastro/ganho, nunca o card de limite
function setBloqueadoFormulario(e) {
  ['inp-nome','inp-valor','inp-classe','inp-data',
   'ganho-nome','ganho-valor','ganho-classe','ganho-data','ganho-fixo']
    .forEach(id => { const el = document.getElementById(id); if (el) el.disabled = e; });
  // Bloqueia botões de cadastro
  document.querySelectorAll('.btn-primary, .btn-ganho, .btn-confirm-remove').forEach(el => {
    if (!el.closest('#modal-editar-overlay') && !el.closest('#card-limite')) el.disabled = e;
  });
}

function setBloqueadoAuth(e) {
  document.querySelectorAll('#tela-auth button, #tela-auth input').forEach(el => el.disabled = e);
}

let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ─── 9. EVENTOS ───────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const act = document.activeElement.id;
    if (['ganho-nome','ganho-valor','ganho-classe','ganho-data'].includes(act)) salvarGanho();
    if (['inp-nome','inp-valor','inp-classe','inp-data'].includes(act)) salvarGasto();
    if (act === 'login-senha') fazerLogin();
    if (act === 'reg-confirma') fazerCadastro();
    if (act === 'inp-limite') salvarLimiteMensal();
  }
});

document.getElementById('modal-overlay').addEventListener('click', function(e) { if (e.target === this) fecharModal(); });
document.getElementById('modal-editar-overlay').addEventListener('click', function(e) { if (e.target === this) fecharModalEditar(); });
