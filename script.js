// --- STATE MANAGEMENT ---
let currentTab = 'home';
let medicalNeeds = [];
let addedPlans = [];
let planIdCounter = 0;
let currentlyEditingNeed = null; // Track the need currently being edited

// Base costs for standard needs (before multiplier)
const BASE_COSTS = {
    pcp: 150,
    specialist: 250,
    prescriptions: 50,
    therapy: 5000
};

const STATE_MULTIPLIERS = {
    'AL': 0.87, 'AK': 1.25, 'AZ': 0.95, 'AR': 0.85, 'CA': 1.35,
    'CO': 1.05, 'CT': 1.18, 'DE': 1.02, 'FL': 0.98, 'GA': 0.92,
    'HI': 1.40, 'ID': 0.90, 'IL': 1.02, 'IN': 0.90, 'IA': 0.92,
    'KS': 0.89, 'KY': 0.88, 'LA': 0.90, 'ME': 1.05, 'MD': 1.15,
    'MA': 1.30, 'MI': 0.94, 'MN': 1.00, 'MS': 0.84, 'MO': 0.88,
    'MT': 0.95, 'NE': 0.92, 'NV': 0.98, 'NH': 1.08, 'NJ': 1.20,
    'NM': 0.91, 'NY': 1.35, 'NC': 0.93, 'ND': 0.95, 'OH': 0.90,
    'OK': 0.86, 'OR': 1.15, 'PA': 1.00, 'RI': 1.10, 'SC': 0.92,
    'SD': 0.94, 'TN': 0.89, 'TX': 0.96, 'UT': 0.98, 'VT': 1.05,
    'VA': 1.02, 'WA': 1.12, 'WV': 0.85, 'WI': 0.95, 'WY': 0.92
};

// --- NAV LOGIC ---
function switchTab(tabId) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active-section'));
    document.getElementById(tabId).classList.add('active-section');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    // Find button matching tab (simple logic)
    const btn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.textContent.toLowerCase().includes(tabId == 'selector' ? 'selector' : tabId));
    if (btn) btn.classList.add('active');

    document.getElementById('navLinks').classList.remove('mobile-active');
    window.scrollTo(0, 0);
}

function showWizardStep(step) {
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`wizard-step-${i}`).classList.add('hidden');
        document.getElementById(`step-btn-${i}`).classList.remove('active');
    }
    document.getElementById(`wizard-step-${step}`).classList.remove('hidden');
    document.getElementById(`step-btn-${step}`).classList.add('active');

    if (step === 3) runComparison();
}

// --- PROFILE LOGIC ---
function loadProfile(type) {
    const state = document.getElementById('userState').value;
    const multiplier = STATE_MULTIPLIERS[state] || 1.0;

    medicalNeeds = [];

    // Base costs with multiplier
    const basePcp = BASE_COSTS.pcp * multiplier;
    const baseSpec = BASE_COSTS.specialist * multiplier;
    const baseRx = BASE_COSTS.prescriptions * multiplier;
    const baseTherapy = BASE_COSTS.therapy * multiplier;

    if (type === 'low') {
        medicalNeeds.push({ id: 1, desc: 'PCP Visit', type: 'pcp', cost: Math.round(basePcp), count: 1, isStandard: true });
    } else if (type === 'med') {
        medicalNeeds.push({ id: 1, desc: 'PCP Visit', type: 'pcp', cost: Math.round(basePcp), count: 2, isStandard: true });
        medicalNeeds.push({ id: 2, desc: 'Specialist Visit', type: 'specialist', cost: Math.round(baseSpec), count: 2, isStandard: true });
        medicalNeeds.push({ id: 3, desc: 'Prescriptions', type: 'other', cost: Math.round(baseRx), count: 4, isStandard: true });
    } else if (type === 'high') {
        medicalNeeds.push({ id: 1, desc: 'PCP Visit', type: 'pcp', cost: Math.round(basePcp), count: 4, isStandard: true });
        medicalNeeds.push({ id: 2, desc: 'Specialist Visit', type: 'specialist', cost: Math.round(baseSpec), count: 6, isStandard: true });
        medicalNeeds.push({ id: 3, desc: 'Other expected medical expenses', type: 'other', cost: Math.round(baseTherapy), count: 1, isStandard: true });
    }
    renderNeeds();
    updateMultiplierDisplay();
}

function updateStateMultiplier() {
    const state = document.getElementById('userState').value;
    const multiplier = STATE_MULTIPLIERS[state] || 1.0;

    // Update only standard needs
    medicalNeeds.forEach(need => {
        if (need.isStandard) {
            if (need.desc === 'PCP Visit') {
                need.cost = Math.round(BASE_COSTS.pcp * multiplier);
            } else if (need.desc === 'Specialist Visit') {
                need.cost = Math.round(BASE_COSTS.specialist * multiplier);
            } else if (need.desc === 'Prescriptions') {
                need.cost = Math.round(BASE_COSTS.prescriptions * multiplier);
            } else if (need.desc === 'Other expected medical expenses') {
                need.cost = Math.round(BASE_COSTS.therapy * multiplier);
            }
        }
    });

    renderNeeds();
    updateMultiplierDisplay();
}

function updateMultiplierDisplay() {
    const state = document.getElementById('userState').value;
    const display = document.getElementById('stateMultiplierInfo');

    if (!display) return;

    if (state && STATE_MULTIPLIERS[state]) {
        const multiplier = STATE_MULTIPLIERS[state];
        const percentage = Math.round((multiplier - 1) * 100);
        const direction = percentage >= 0 ? '+' : '';
        display.innerHTML = `<small style="color: #6B7280;">💰 Cost multiplier: <strong>${multiplier.toFixed(2)}</strong> (${direction}${percentage}% vs. baseline)</small>`;
        display.style.display = 'block';
    } else {
        display.style.display = 'none';
    }
}

function addCustomNeed() {
    const desc = document.getElementById('newDesc').value;
    const type = document.getElementById('newType').value;
    const cost = parseFloat(document.getElementById('newCost').value) || 0;
    const count = parseFloat(document.getElementById('newCount').value) || 1;

    if (!desc || cost <= 0) return alert("Please enter description and cost.");

    medicalNeeds.push({ id: Date.now(), desc, type, cost, count, isStandard: false });

    // Clear inputs and editing state
    document.getElementById('newDesc').value = '';
    document.getElementById('newCost').value = '';
    document.getElementById('newCount').value = '1';
    currentlyEditingNeed = null;

    renderNeeds();
}

function editNeed(id) {
    // If already editing another need, restore it first
    if (currentlyEditingNeed !== null) {
        medicalNeeds.push(currentlyEditingNeed);
    }

    const need = medicalNeeds.find(n => n.id === id);
    if (!need) return;

    // Store the need being edited
    currentlyEditingNeed = { ...need };

    document.getElementById('newDesc').value = need.desc;
    document.getElementById('newType').value = need.type;
    document.getElementById('newCost').value = need.cost;
    document.getElementById('newCount').value = need.count;

    removeNeed(id);
    // Scroll to input area
    document.getElementById('newDesc').scrollIntoView({ behavior: 'smooth' });
}

function removeNeed(id) {
    medicalNeeds = medicalNeeds.filter(n => n.id !== id);
    renderNeeds();
}

function renderNeeds() {
    const tbody = document.getElementById('needsTableBody');
    tbody.innerHTML = '';
    let total = 0;

    medicalNeeds.forEach(n => {
        const lineTotal = n.cost * n.count;
        total += lineTotal;
        tbody.innerHTML += `
            <tr>
                <td>${n.desc}</td>
                <td><span class="tag">${n.type.toUpperCase()}</span></td>
                <td>$${n.cost}</td>
                <td>${n.count}</td>
                <td>$${lineTotal}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editNeed(${n.id})" style="margin-right:5px;">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="removeNeed(${n.id})">X</button>
                </td>
            </tr>
        `;
    });
    document.getElementById('totalEstCost').innerText = `Total Est. Cost: $${total.toLocaleString()}`;
}

// --- PLAN INPUT LOGIC ---
function toggleCopayFields() {
    const checked = document.getElementById('hasCopays').checked;
    const fields = document.getElementById('copayFields');
    if (checked) fields.classList.remove('hidden');
    else fields.classList.add('hidden');
}

function addPlan() {
    const name = document.getElementById('planName').value;
    if (!name) return alert("Please name the plan.");

    const newPlan = {
        id: planIdCounter++,
        name: name,
        prem: parseFloat(document.getElementById('planPrem').value) || 0,
        ded: parseFloat(document.getElementById('planDed').value) || 0,
        moop: parseFloat(document.getElementById('planMoop').value) || 0,
        coin: parseFloat(document.getElementById('planCoin').value) || 0,
        fund: parseFloat(document.getElementById('planFund').value) || 0,
        hasCopays: document.getElementById('hasCopays').checked,
        copays: {
            pcp: parseFloat(document.getElementById('copayPcp').value) || 0,
            specialist: parseFloat(document.getElementById('copaySpec').value) || 0,
            uc: parseFloat(document.getElementById('copayUc').value) || 0,
            er: parseFloat(document.getElementById('copayEr').value) || 0
        }
    };

    addedPlans.push(newPlan);
    renderPlanList();

    // Reset form
    document.getElementById('planName').value = '';
}

function renderPlanList() {
    const container = document.getElementById('planListContainer');
    if (addedPlans.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light); font-style: italic;">No plans added yet.</p>';
        return;
    }
    container.innerHTML = '';
    addedPlans.forEach((p, index) => {
        container.innerHTML += `
            <div style="background: #fff; border: 1px solid #ddd; padding: 10px; margin-bottom: 5px; border-radius: 4px; display: flex; justify-content: space-between;">
                <strong>${p.name}</strong>
                <span>Prem: $${p.prem}/mo</span>
                <span style="color: red; cursor: pointer;" onclick="removePlan(${index})">Delete</span>
            </div>
        `;
    });
}

function removePlan(index) {
    addedPlans.splice(index, 1);
    renderPlanList();
}

// --- CALCULATION ENGINE ---
function runComparison() {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';

    if (addedPlans.length === 0) {
        container.innerHTML = '<p>Please add plans in Step 2.</p>';
        return;
    }

    // Calculate logic for each plan
    let results = addedPlans.map(plan => {
        let log = [];
        let totalPremium = plan.prem * 12;
        let patientPaid = 0;
        let deductPaid = 0;

        log.push({ desc: "Annual Premium", val: totalPremium });

        // Iterate Needs
        medicalNeeds.forEach(need => {
            let cost = need.cost;
            let count = need.count;

            for (let i = 0; i < count; i++) {
                // Stop if MOOP reached
                if (patientPaid >= plan.moop) {
                    log.push({ desc: `MOOP Reached - ${need.desc} covered 100%`, val: 0 });
                    continue;
                }

                let charge = cost;
                let youPay = 0;
                let note = "";

                // Copay Logic
                if (plan.hasCopays && ['pcp', 'specialist', 'uc', 'er'].includes(need.type)) {
                    let copayAmt = 0;
                    if (need.type === 'pcp') copayAmt = plan.copays.pcp;
                    if (need.type === 'specialist') copayAmt = plan.copays.specialist;
                    if (need.type === 'uc') copayAmt = plan.copays.uc;
                    if (need.type === 'er') copayAmt = plan.copays.er;

                    youPay = Math.min(charge, copayAmt);
                    note = `Copay applied ($${copayAmt})`;
                }
                // Deductible Logic
                else {
                    let remainingDed = plan.ded - deductPaid;
                    if (remainingDed < 0) remainingDed = 0;

                    if (remainingDed > 0) {
                        // In deductible phase
                        let toDed = Math.min(charge, remainingDed);
                        youPay += toDed;
                        deductPaid += toDed;
                        charge -= toDed;
                        note = "Applied to Deductible";
                    }

                    if (charge > 0) {
                        // Coinsurance phase
                        let coinsAmt = charge * (plan.coin / 100);
                        youPay += coinsAmt;
                        note += (note ? " + " : "") + `Coinsurance (${plan.coin}%)`;
                    }
                }

                // Check MOOP Cap
                if (patientPaid + youPay > plan.moop) {
                    youPay = plan.moop - patientPaid;
                    note += " (Capped at MOOP)";
                }

                patientPaid += youPay;
                log.push({ desc: `${need.desc} (${i + 1}/${count})`, val: youPay, note: note });
            }
        });

        let netCost = totalPremium + patientPaid - plan.fund;
        return { plan, totalPremium, patientPaid, netCost, log };
    });

    // Sort by Cheapest
    results.sort((a, b) => a.netCost - b.netCost);

    // Render
    results.forEach((r, idx) => {
        const isWinner = idx === 0;
        let logHtml = r.log.map(l => `
            <div class="log-row">
                <span>${l.desc} ${l.note ? '<span style="font-size:0.8em; color:#666">[' + l.note + ']</span>' : ''}</span>
                <span>$${l.val.toFixed(2)}</span>
            </div>
        `).join('');

        // Add Savings/Fund to log
        if (r.plan.fund > 0) {
            logHtml += `<div class="log-row" style="color: green;"><span>Employer Contribution</span><span>-$${r.plan.fund}</span></div>`;
        }

        container.innerHTML += `
            <div class="card plan-result-card ${isWinner ? 'winner' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="margin:0;">${r.plan.name} ${isWinner ? '<span class="badge-best">Best Value</span>' : ''}</h3>
                        <p style="font-size:0.9rem;">Premium: $${r.plan.prem}/mo | Ded: $${r.plan.ded}</p>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size: 1.5rem; font-weight:bold; color: var(--primary);">$${r.netCost.toFixed(2)}</div>
                        <div style="font-size: 0.8rem; color: var(--text-light);">Net Annual Cost</div>
                    </div>
                </div>
                
                <div class="mt-4">
                    <button class="btn btn-outline btn-sm" onclick="document.getElementById('log-${r.plan.id}').classList.toggle('hidden')">Toggle Calculation Breakdown</button>
                    <div id="log-${r.plan.id}" class="calc-log hidden">
                        <h4>Calculation Log</h4>
                        ${logHtml}
                        <div class="log-row" style="border-top: 1px solid #aaa; margin-top: 5px; padding-top: 5px; font-weight:bold;">
                            <span>TOTAL</span>
                            <span>$${r.netCost.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}
