// --- 1. CONFIGURATION ---
const COUT_ACHAT_COMPTE = 6200; 
// REMPLACE ICI PAR TON URL DE DÉPLOIEMENT GOOGLE SHEETS
const URL_GOOGLE_SHEETS = "https://script.google.com/macros/s/AKfycbzPyiA9YoisdFt5wTGvsEcmlgEP0fg63fNYdgLJi4dVzlcTsM-Qvlmw2B-j2eO00zD41g/exec";

// --- LOGIQUE DES TARIFS CORRIGÉE ---
function calculerPrix(diffM) {
    if (diffM >= 12) return 14500;
    if (diffM >= 9) return 13000;
    if (diffM >= 8) return 11500;
    if (diffM >= 7) return 10000;
    if (diffM >= 6) return 8500;
    if (diffM >= 5) return 7000;
    if (diffM >= 4) return 5500;
    if (diffM >= 3) return 4000;
    if (diffM >= 2) return 2500;
    return 1500; // Tarif pour 1 mois
}

let currentData = localStorage.getItem('papi_db') || "amflixen@gmail.com\nProfil 1 ———-»2 (10 et 15 mai)";
let paiementsValides = JSON.parse(localStorage.getItem('papi_paiements')) || {};
let etatsTV = JSON.parse(localStorage.getItem('papi_tv')) || {};

// --- 2. LOGIQUE DE DATE ---
function parserDatesMultiples(str) {
    if (!str) return [];
    const moisFr = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "aoû", "sep", "oct", "nov", "déc"];
    let clean = str.toLowerCase().trim().replace(/[\(\)]/g, '');
    let segments = clean.split(/\bet\b|,/);
    let datesTrouvees = [];
    let dernierMoisTrouve = null;
    for (let i = segments.length - 1; i >= 0; i--) {
        let s = segments[i].trim();
        const matchAnnee = s.match(/\b(202\d)\b/);
        let anneeVal = matchAnnee ? parseInt(matchAnnee[1]) : 2026;
        const matchJour = s.match(/(\d+)/);
        const matchMois = s.match(/[a-zûéû]+/g);
        let moisIdx = -1;
        if (matchMois) {
            for (let mot of matchMois) {
                let idx = moisFr.findIndex(m => mot.startsWith(m));
                if (idx !== -1) { moisIdx = idx; break; }
            }
        }
        if (moisIdx === -1 && dernierMoisTrouve !== null) moisIdx = dernierMoisTrouve;
        else if (moisIdx !== -1) dernierMoisTrouve = moisIdx;
        if (matchJour && moisIdx !== -1) datesTrouvees.unshift(new Date(anneeVal, moisIdx, parseInt(matchJour[1]), 0, 0, 0));
    }
    return datesTrouvees;
}

// --- 3. TOGGLES ---
function togglePaye(id) {
    paiementsValides[id] = !paiementsValides[id];
    localStorage.setItem('papi_paiements', JSON.stringify(paiementsValides));
    render(document.getElementById('search').value);
}

function toggleTV(email) {
    etatsTV[email] = !etatsTV[email];
    localStorage.setItem('papi_tv', JSON.stringify(etatsTV));
    render(document.getElementById('search').value);
}

// --- 4. ANALYSE ET STATISTIQUES (355 CLIENTS) ---
function showStats() {
    const lines = currentData.split('\n');
    let totalPers = 0, totalCA = 0, nbComptes = 0, block = null;

    lines.forEach((line, lineIdx) => {
        const text = line.trim();
        if (!text || text.toLowerCase() === "compte") return;
        if (text.includes('@')) { nbComptes++; block = { email: text }; }
        else if (block) {
            const partieDroite = text.split('»')[1];
            if (partieDroite) {
                let nbLigne = parseInt(partieDroite.match(/^(\d+)/)) || 1;
                totalPers += nbLigne; // COMPTE PILE 355 ICI
                const matchParentheses = text.match(/\(([^)]+)\)/g);
                if (matchParentheses) {
                    matchParentheses.forEach((p, pIdx) => {
                        let dates = parserDatesMultiples(p);
                        dates.forEach((dateExp, dIdx) => {
                            const idUnique = `${block.email}-${lineIdx}-${pIdx}-${dIdx}`;
                            if (paiementsValides[idUnique]) {
                                const maintenant = new Date();
                               const m = Math.max(1, (dateExp.getFullYear() - maintenant.getFullYear()) * 12 + (dateExp.getMonth() - maintenant.getMonth()));
                               totalCA += Math.round(calculerPrix(m) * (nbLigne / (matchParentheses.length * dates.length)));
                            }
                        });
                    });
                }
            }
        }
    });

    const totalDepenses = nbComptes * COUT_ACHAT_COMPTE;
    const benefice = totalCA - totalDepenses;
    const rentabilite = totalDepenses > 0 ? Math.round((benefice / totalDepenses) * 100) : 0;

    const modalHtml = `
        <div id="statsModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; box-sizing:border-box;">
            <div style="background:#1a1a1a; width:100%; max-width:400px; border-radius:15px; border:1px solid #333; padding:20px; color:white; position:relative;">
                <button onclick="document.getElementById('statsModal').remove()" style="position:absolute; top:10px; right:10px; background:none; border:none; color:gray; font-size:20px;">✕</button>
                <h3 style="margin-top:0; color:#4da6ff; border-bottom:1px solid #333; padding-bottom:10px;">Analyse de Performance</h3>
                <div style="margin:20px 0;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>Clients Actifs</span> <b>${totalPers}</b></div>
                    <div style="height:8px; background:#333; border-radius:4px; overflow:hidden;"><div style="width:${Math.min((totalPers/400)*100, 100)}%; height:100%; background:#4da6ff;"></div></div>
                </div>
                <div style="margin:20px 0;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>Chiffre d'Affaires</span> <b style="color:#2ecc71;">${totalCA} F</b></div>
                    <div style="height:8px; background:#333; border-radius:4px; overflow:hidden;"><div style="width:100%; height:100%; background:#2ecc71;"></div></div>
                </div>
                <div style="margin:20px 0;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>Dépenses</span> <b style="color:#ff4d4d;">${totalDepenses} F</b></div>
                    <div style="height:8px; background:#333; border-radius:4px; overflow:hidden;"><div style="width:${Math.min((totalDepenses/totalCA)*100 || 0, 100)}%; height:100%; background:#ff4d4d;"></div></div>
                </div>
                <div style="background:#222; padding:15px; border-radius:10px; margin-top:20px;">
                    <div style="display:flex; justify-content:space-between; font-weight:bold;"><span>Bénéfice Net :</span><span style="color:${benefice >= 0 ? '#2ecc71' : '#ff4d4d'}">${benefice} F</span></div>
                    <div style="font-size:12px; color:#888; margin-top:5px;">Rentabilité : ${rentabilite}% ${rentabilite > 50 ? '🚀' : '📈'}</div>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// --- 5. RENDU ---
function render(filter = "") {
    const keyword = filter.toLowerCase().trim();
    const lines = currentData.split('\n');
    const maintenant = new Date();
    maintenant.setHours(0, 0, 0, 0);
    let html = "", block = null, allBlocks = [];

    lines.forEach((line, lineIdx) => {
        const text = line.trim();
        if (!text || text.toLowerCase() === "compte") return;
        if (text.includes('@')) {
            if (block) allBlocks.push(block);
            let isTV = etatsTV[text] || false;
            block = { email: text, items: [], totalUsers: 0, totalCA: 0, hasTV: isTV, rawText: text };
        } else if (block) {
            block.rawText += " " + text;
            let nbPersLigne = 0;
            const partieDroite = text.split('»')[1];
            if (partieDroite) nbPersLigne = parseInt(partieDroite.match(/^(\d+)/)) || 1;
            let gainLigneTotal = 0, badgesHtml = "";
            const matchParentheses = text.match(/\(([^)]+)\)/g);
            if (matchParentheses) {
                matchParentheses.forEach((p, pIdx) => {
                    let dates = parserDatesMultiples(p);
                    dates.forEach((dateExp, dIdx) => {
                        const idUnique = `${block.email}-${lineIdx}-${pIdx}-${dIdx}`;
                        const estPaye = paiementsValides[idUnique] || false;
                        let status = "", couleur = "#aaa", border = estPaye ? "1px solid #2ecc71" : "1px solid #333";
                        const dDays = Math.ceil((dateExp - maintenant) / (1000 * 60 * 60 * 24));
                        const m = Math.max(1, (dateExp.getFullYear() - maintenant.getFullYear()) * 12 + (dateExp.getMonth() - maintenant.getMonth()));
                        status = (dDays > 0 && dDays <= 10) ? `${dDays} j ⚠️` : `${m} mois`;
                        if (dDays <= 0) { status = "Terminé ❌"; couleur = "#ff4d4d"; }
                        else if (dDays <= 10) couleur = "#ffcc00";
                        if (estPaye && dDays > 0) {
                            let prix = calculerPrix(m);
                            gainLigneTotal += prix * (nbPersLigne / (matchParentheses.length * dates.length));
                        }
                        badgesHtml += `<div style="display:flex; align-items:center; margin-left:8px;"><span style="font-size:9px; color:${couleur}; background:#111; padding:2px 5px; border-radius:10px 0 0 10px; font-weight:bold; border:${border}; border-right:none;">${status}</span><span onclick="togglePaye('${idUnique}')" style="cursor:pointer; font-size:14px; color:${estPaye ? "#ffcc00" : "#555"}; background:#111; padding:0px 5px; border-radius:0 10px 10px 0; border:${border}; border-left:1px solid #333; line-height:18px;">${estPaye ? '★' : '☆'}</span></div>`;
                    });
                });
            }
            block.items.push({ text, badges: badgesHtml });
            block.totalUsers += nbPersLigne;
            block.totalCA += Math.round(gainLigneTotal);
        }
    });
    if (block) allBlocks.push(block);

    let filtered = allBlocks.filter(b => {
        if (keyword === "tv") return b.hasTV;
        if (keyword === "no tv") return !b.hasTV;
        return b.rawText.toLowerCase().includes(keyword);
    });

    filtered.forEach(b => {
        const benefice = b.totalCA - COUT_ACHAT_COMPTE;
        html += `<div style="margin-top:15px; background:#1a1a1a; border-radius:8px; border:1px solid #333; overflow:hidden;">
            <div style="padding:10px; background:#222; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="color:#4da6ff; font-weight:bold;">${b.email}</span>
                    <button onclick="toggleTV('${b.email}')" style="background:${b.hasTV ? '#4da6ff' : '#333'}; color:white; border:none; border-radius:4px; font-size:10px; padding:2px 6px; cursor:pointer; font-weight:bold;">${b.hasTV ? '📺 TV' : '📱 MOB'}</button>
                </div>
                <span style="font-size:10px; color:#888;">${b.totalUsers} pers.</span>
            </div>
            <div style="padding:5px 0;">`;
        b.items.forEach(it => { html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:5px 10px;"><span style="font-size:12px; color:#eee;">${it.text}</span><div style="display:flex; flex-wrap:wrap; justify-content:flex-end; gap:5px;">${it.badges}</div></div>`; });
        html += `</div><div style="padding:10px; background:#111; border-top:1px solid #333; font-size:11px; display:flex; justify-content:space-between;"><span>Gain Validé (★) : <b style="color:#2ecc71;">+ ${b.totalCA} F</b></span><span>Profit : <b style="color:${benefice > 0 ? '#2ecc71' : '#ff4d4d'}">${benefice} F</b></span></div></div>`;
    });
    document.getElementById('content').innerHTML = html || "Aucun résultat";
}

// --- 6. INITIALISATION ---
window.onload = function() {
    const btnContainer = document.getElementById('btnEdit').parentElement;
    const btnRes = document.createElement('button');
    btnRes.innerText = "📊 Résultats"; btnRes.onclick = showStats;
    btnRes.style = "background:#2ecc71; color:white; border:none; padding:8px 12px; border-radius:5px; font-weight:bold; cursor:pointer; margin-right:5px;";
    btnContainer.insertBefore(btnRes, document.getElementById('btnEdit'));
    
    document.getElementById('btnEdit').onclick = () => { 
        document.getElementById('content').style.display='none'; 
        document.getElementById('editor').style.display='block'; 
        document.getElementById('editor').value=currentData; 
        document.getElementById('btnEdit').style.display='none'; 
        document.getElementById('btnSave').style.display='block'; 
    };
    
    document.getElementById('btnSave').onclick = () => { 
        currentData=document.getElementById('editor').value; 
        localStorage.setItem('papi_db', currentData); 
        
        // ENVOI VERS GOOGLE SHEETS
        if(URL_GOOGLE_SHEETS !== "COLLE_TON_URL_ICI") {
            fetch(URL_GOOGLE_SHEETS, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'content=' + encodeURIComponent(currentData)
            });
        }
        
        document.getElementById('editor').style.display='none'; 
        document.getElementById('content').style.display='block'; 
        document.getElementById('btnEdit').style.display='block'; 
        document.getElementById('btnSave').style.display='none'; 
        render(); 
    };
    
    document.getElementById('btnCopy').onclick = () => { navigator.clipboard.writeText(currentData); alert("Copié !"); };
    document.getElementById('search').oninput = (e) => render(e.target.value);
    render();
};
