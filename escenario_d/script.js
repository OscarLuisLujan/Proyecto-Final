// ======================================================================
// MÓDULO D: INTEGRACIÓN NUMÉRICA - MOTOR COMPLETO
// ======================================================================
let graficos = {
    trapecio: null,
    simpson13: null,
    simpson38: null
};

let debounceTimerGlobal = null;
let calculoEnProgreso = false;

// Valores por defecto
const valoresPorDefecto = {
    dias: 30,
    base: 85.00,
    ingreso: 4200,
    tasa: 0.18
};

// ======================================================================
// 1. FUNCIÓN DE PRECIOS Y GENERACIÓN DE PUNTOS
// ======================================================================

/**
 * Función de precio diario: modelo de inflación progresiva no lineal
 * P(t) = P₀ * (1 + k * (t/n)^α)
 * donde α = 1.5 genera una curvatura realista (aceleración suave)
 */
function precioDia(t, dias, base, tasa, alpha = 1.5) {
    return base * (1 + tasa * Math.pow(t / dias, alpha));
}

function generarPuntos(dias, base, tasa, alpha = 1.5) {
    const pts = [];
    for (let t = 0; t <= dias; t++) {
        pts.push({
            x: t,
            y: precioDia(t, dias, base, tasa, alpha)
        });
    }
    return pts;
}

// ======================================================================
// 2. ALGORITMOS DE INTEGRACIÓN NUMÉRICA (RIGUROSIDAD MATEMÁTICA)
// ======================================================================

/**
 * Regla del Trapecio Compuesta
 * Fórmula: (h/2)[f(x₀) + 2∑f(xᵢ) + f(xₙ)] para i=1..n-1
 * Error de truncamiento: O(h²)
 * Válida para cualquier número de intervalos
 */
function trapecio(puntos, h) {
    const n = puntos.length - 1;
    if (n < 1) return 0;
    
    let suma = puntos[0].y + puntos[n].y;
    for (let i = 1; i < n; i++) {
        suma += 2 * puntos[i].y;
    }
    return (h / 2) * suma;
}

/**
 * Regla de Simpson 1/3 Compuesta
 * Fórmula: (h/3)[f(x₀) + 4f(x₁) + 2f(x₂) + 4f(x₃) + ... + f(xₙ)]
 * Patrón: 1, 4, 2, 4, 2, ..., 4, 1
 * Error de truncamiento: O(h⁴)
 * Requiere: número PAR de intervalos (n par)
 */
function simpson13(puntos, h) {
    const n = puntos.length - 1;
    if (n < 2 || n % 2 !== 0) return null; // Requiere al menos 2 intervalos y que sean pares
    
    let suma = puntos[0].y + puntos[n].y;
    for (let i = 1; i < n; i++) {
        suma += (i % 2 === 0 ? 2 : 4) * puntos[i].y;
    }
    return (h / 3) * suma;
}

/**
 * Regla de Simpson 3/8 Compuesta
 * Fórmula: (3h/8)[f(x₀) + 3f(x₁) + 3f(x₂) + 2f(x₃) + 3f(x₄) + 3f(x₅) + 2f(x₆) + ... + f(xₙ)]
 * Patrón: 1, 3, 3, 2, 3, 3, 2, ..., 3, 3, 1
 * Error de truncamiento: O(h⁴)
 * Requiere: número de intervalos MÚLTIPLO DE 3
 */
function simpson38(puntos, h) {
    const n = puntos.length - 1;
    if (n < 3 || n % 3 !== 0) return null; // Requiere al menos 3 intervalos y múltiplo de 3
    
    let suma = puntos[0].y + puntos[n].y;
    for (let i = 1; i < n; i++) {
        suma += (i % 3 === 0 ? 2 : 3) * puntos[i].y;
    }
    return (3 * h / 8) * suma;
}

// ======================================================================
// 3. ORQUESTACIÓN DE CÁLCULOS Y RENDERIZADO
// ======================================================================

function dispararCalculo() {
    if (calculoEnProgreso) return;
    clearTimeout(debounceTimerGlobal);
    debounceTimerGlobal = setTimeout(() => {
        ejecutarTodosLosMetodos();
    }, 400);
}

async function ejecutarTodosLosMetodos() {
    if (calculoEnProgreso) return;
    calculoEnProgreso = true;
    
    const loadingDiv = document.getElementById('loadingIndicator');
    const progressBar = document.getElementById('progressBar');
    const btnEjecutar = document.getElementById('btnEjecutar');
    
    loadingDiv.classList.remove('d-none');
    btnEjecutar.disabled = true;
    progressBar.style.width = '0%';
    mostrarEstado('', 'info');

    await new Promise(resolve => setTimeout(resolve, 50));
    progressBar.style.width = '25%';

    try {
        // Leer parámetros
        const dias = parseInt(document.getElementById('inputDias').value) || 30;
        const base = parseFloat(document.getElementById('inputBase').value) || 85;
        const ingreso = parseFloat(document.getElementById('inputIngreso').value) || 4200;
        const tasa = parseFloat(document.getElementById('inputTasa').value) || 0.18;

        if (dias < 2) throw new Error("Se necesitan al menos 2 días para integrar.");
        if (base <= 0) throw new Error("El precio base debe ser positivo.");
        if (ingreso <= 0) throw new Error("El ingreso familiar debe ser positivo.");

        // Generar puntos
        const puntos = generarPuntos(dias, base, tasa);
        const h = 1; // paso diario

        await new Promise(resolve => setTimeout(resolve, 50));
        progressBar.style.width = '50%';

        // Calcular los 3 métodos
        const resultadoTrapecio = trapecio(puntos, h);
        const resultadoSimpson13 = simpson13(puntos, h);
        const resultadoSimpson38 = simpson38(puntos, h);

        // Costo estable (sin inflación)
        const costoEstable = base * dias;

        // Usar Simpson 1/3 como referencia si está disponible, sino Trapecio
        const referencia = resultadoSimpson13 !== null ? resultadoSimpson13 : resultadoTrapecio;
        const perdida = ((referencia - costoEstable) / ingreso) * 100;

        // Encontrar punto crítico: día donde gasto acumulado ≥ ingreso
        let puntoCritico = null;
        let acumulado = 0;
        for (let i = 0; i < puntos.length; i++) {
            acumulado += puntos[i].y;
            if (acumulado >= ingreso && !puntoCritico) {
                puntoCritico = {
                    dia: puntos[i].x,
                    precio: puntos[i].y,
                    acumulado: parseFloat(acumulado.toFixed(2))
                };
                break;
            }
        }

        await new Promise(resolve => setTimeout(resolve, 50));
        progressBar.style.width = '75%';

        // Generar contenido para cada método
        const metodos = [
            { id: 'trapecio', nombre: 'Regla del Trapecio', valor: resultadoTrapecio, color: 'primary', icono: 'fa-draw-polygon' },
            { id: 'simpson13', nombre: 'Simpson 1/3', valor: resultadoSimpson13, color: 'success', icono: 'fa-chart-line' },
            { id: 'simpson38', nombre: 'Simpson 3/8', valor: resultadoSimpson38, color: 'danger', icono: 'fa-chart-area' }
        ];

        metodos.forEach(m => {
            generarContenidoCompleto(
                m.id, m.nombre, m.valor, m.color, m.icono,
                puntos, h, dias, base, ingreso, tasa,
                referencia, costoEstable, perdida, puntoCritico,
                resultadoTrapecio, resultadoSimpson13, resultadoSimpson38
            );
        });

        progressBar.style.width = '100%';
        mostrarEstado('✅ Integración completada para los 3 métodos.', 'success');

    } catch (error) {
        mostrarEstado(`❌ Error: ${error.message}`, 'danger');
        console.error(error);
    } finally {
        setTimeout(() => {
            loadingDiv.classList.add('d-none');
            btnEjecutar.disabled = false;
            calculoEnProgreso = false;
        }, 500);
    }
}

// ======================================================================
// 4. GENERACIÓN DE CONTENIDO COMPLETO POR MÉTODO
// ======================================================================

function generarContenidoCompleto(metodoId, nombreMetodo, valorIntegral, colorMetodo, iconoMetodo,
                                   puntos, h, dias, base, ingreso, tasa,
                                   referencia, costoEstable, perdida, puntoCritico,
                                   valTrap, valS13, valS38) {
    const container = document.getElementById(`contenido-${metodoId}`);
    if (!container) return;

    const metodoValido = valorIntegral !== null;
    const dentroRango = true; // Siempre dentro del rango en integración definida

    let html = '';

    // Si el método no es aplicable (ej: Simpson 1/3 con intervalos impares)
    if (!metodoValido) {
        html = `
        <div class="alert alert-warning m-4 fade-in">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>${nombreMetodo} no es aplicable</strong> con la configuración actual 
            (${dias} días = ${dias} intervalos).
            ${metodoId === 'simpson13' ? 'Se requiere un número <strong>PAR</strong> de intervalos (días impar).' : ''}
            ${metodoId === 'simpson38' ? 'Se requiere un número de intervalos <strong>MÚLTIPLO DE 3</strong>.' : ''}
            <br>Ajuste el número de días para habilitar este método.
        </div>`;
        container.innerHTML = html;
        return;
    }

    // ================================================================
    // SECCIÓN 4: RESULTADOS DEL MÉTODO
    // ================================================================
    html += `
    <div class="mb-4 fade-in">
        <div class="d-flex align-items-center mb-3">
            <span class="seccion-numero me-3">4</span>
            <h4 class="fw-bold text-dark mb-0">
                <i class="fas ${iconoMetodo} text-${colorMetodo} me-2"></i>
                Resultados — ${nombreMetodo}
            </h4>
        </div>
        <div class="row g-3">
            <!-- Costo Real Acumulado -->
            <div class="col-md-4">
                <div class="card card-resultado shadow-sm h-100" style="border-top: 4px solid var(--bs-${colorMetodo})">
                    <div class="card-body text-center">
                        <i class="fas fa-receipt fs-1 text-${colorMetodo} mb-2 d-block"></i>
                        <h6 class="text-muted small mb-2">Costo Real Acumulado</h6>
                        <h2 class="fw-bold text-${colorMetodo} mb-1">Bs ${valorIntegral.toFixed(2)}</h2>
                        <small class="text-muted">Área bajo la curva (${dias} días)</small>
                    </div>
                </div>
            </div>
            <!-- Costo sin Inflación -->
            <div class="col-md-4">
                <div class="card card-resultado shadow-sm h-100" style="border-top: 4px solid #a68a8a">
                    <div class="card-body text-center">
                        <i class="fas fa-coins fs-1 text-secondary mb-2 d-block"></i>
                        <h6 class="text-muted small mb-2">Costo sin Inflación</h6>
                        <h2 class="fw-bold text-secondary mb-1">Bs ${costoEstable.toFixed(2)}</h2>
                        <small class="text-muted">Precio base × ${dias} días</small>
                    </div>
                </div>
            </div>
            <!-- Pérdida de Poder Adquisitivo -->
            <div class="col-md-4">
                <div class="card card-resultado shadow-sm h-100" style="border-top: 4px solid ${perdida > 25 ? '#dc3545' : '#ff9f1c'}">
                    <div class="card-body text-center">
                        <i class="fas fa-chart-line-down fs-1 ${perdida > 25 ? 'text-danger' : 'text-warning'} mb-2 d-block"></i>
                        <h6 class="text-muted small mb-2">Pérdida de Poder Adquisitivo</h6>
                        <h2 class="fw-bold ${perdida > 25 ? 'text-danger' : 'text-warning'} mb-1">
                            ${Math.abs(perdida).toFixed(1)}%
                        </h2>
                        <small class="text-muted">Del ingreso familiar (Bs ${ingreso})</small>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Análisis adicional -->
        <div class="row g-3 mt-2">
            <div class="col-md-6">
                <div class="card bg-light border-0 shadow-sm h-100">
                    <div class="card-body">
                        <h6 class="fw-bold text-dark">
                            <i class="fas fa-question-circle text-${colorMetodo} me-2"></i>
                            ¿Cuánto gastó una familia durante el mes?
                        </h6>
                        <p class="mb-0 text-muted">
                            El gasto total estimado es de <strong>Bs ${valorIntegral.toFixed(2)}</strong> 
                            en ${dias} días, con un promedio diario de 
                            <strong>Bs ${(valorIntegral / dias).toFixed(2)}</strong>.
                        </p>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card bg-light border-0 shadow-sm h-100">
                    <div class="card-body">
                        <h6 class="fw-bold text-dark">
                            <i class="fas fa-balance-scale text-${colorMetodo} me-2"></i>
                            ¿Cuánto hubiera gastado si los precios no subían?
                        </h6>
                        <p class="mb-0 text-muted">
                            Sin inflación: <strong>Bs ${costoEstable.toFixed(2)}</strong>. 
                            Diferencia: <strong class="text-danger">+Bs ${(valorIntegral - costoEstable).toFixed(2)}</strong> 
                            adicionales por la crisis.
                        </p>
                    </div>
                </div>
            </div>
        </div>
        
        ${puntoCritico ? `
        <div class="row g-3 mt-2">
            <div class="col-12">
                <div class="card bg-${perdida > 25 ? 'danger' : 'warning'} bg-opacity-10 border-0 shadow-sm">
                    <div class="card-body">
                        <h6 class="fw-bold text-dark">
                            <i class="fas fa-star text-danger me-2"></i>
                            ⚠️ Punto Crítico Detectado
                        </h6>
                        <p class="mb-0">
                            El <strong>día ${puntoCritico.dia}</strong> el gasto acumulado 
                            (<strong>Bs ${puntoCritico.acumulado.toFixed(2)}</strong>) supera el ingreso familiar 
                            (<strong>Bs ${ingreso}</strong>). A partir de este punto, la familia opera en déficit.
                        </p>
                    </div>
                </div>
            </div>
        </div>` : `
        <div class="row g-3 mt-2">
            <div class="col-12">
                <div class="card bg-success bg-opacity-10 border-0 shadow-sm">
                    <div class="card-body">
                        <h6 class="fw-bold text-dark">
                            <i class="fas fa-shield-alt text-success me-2"></i>
                            Sin Punto Crítico
                        </h6>
                        <p class="mb-0">
                            El gasto acumulado <strong>no supera</strong> el ingreso familiar de Bs ${ingreso} 
                            durante los ${dias} días analizados.
                        </p>
                    </div>
                </div>
            </div>
        </div>`}
    </div>`;

    // ================================================================
    // SECCIÓN 5: TABLA COMPARATIVA DE PRECISIÓN
    // ================================================================
    html += `
    <div class="mb-4 fade-in">
        <div class="d-flex align-items-center mb-3">
            <span class="seccion-numero me-3">5</span>
            <h4 class="fw-bold text-dark mb-0">
                <i class="fas fa-table text-${colorMetodo} me-2"></i>
                Tabla Comparativa de Precisión — ${nombreMetodo}
            </h4>
        </div>
        <div class="card border-0 shadow-sm">
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead class="bg-light">
                            <tr>
                                <th class="py-3">Método</th>
                                <th class="py-3">Costo Calculado (Bs)</th>
                                <th class="py-3">Error vs Referencia</th>
                                <th class="py-3">Orden de Precisión</th>
                                <th class="py-3">Aplicable</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="${metodoId === 'trapecio' ? 'table-active fw-bold' : ''}">
                                <td><strong>Regla del Trapecio</strong></td>
                                <td class="text-primary fw-bold">${valTrap ? valTrap.toFixed(4) : 'N/A'}</td>
                                <td>${valTrap && referencia ? (Math.abs(valTrap - referencia) > 1 ? 
                                    `<span class="text-danger">+${Math.abs(valTrap - referencia).toFixed(2)} Bs</span>` : 
                                    `<span class="text-success">±${Math.abs(valTrap - referencia).toFixed(2)} Bs</span>`) : '-'}</td>
                                <td><span class="badge bg-secondary">O(h²)</span></td>
                                <td>${valTrap ? '<i class="fas fa-check-circle text-success"></i>' : '<i class="fas fa-times-circle text-danger"></i>'}</td>
                            </tr>
                            <tr class="${metodoId === 'simpson13' ? 'table-active fw-bold' : ''}">
                                <td><strong>Simpson 1/3</strong></td>
                                <td class="text-success fw-bold">${valS13 ? valS13.toFixed(4) : 'N/A'}</td>
                                <td class="text-success"><i class="fas fa-check-circle me-1"></i>Referencia</td>
                                <td><span class="badge bg-success">O(h⁴)</span></td>
                                <td>${valS13 ? '<i class="fas fa-check-circle text-success"></i>' : 
                                    '<i class="fas fa-times-circle text-danger" title="Requiere intervalos pares"></i>'}</td>
                            </tr>
                            <tr class="${metodoId === 'simpson38' ? 'table-active fw-bold' : ''}">
                                <td><strong>Simpson 3/8</strong></td>
                                <td class="text-danger fw-bold">${valS38 ? valS38.toFixed(4) : 'N/A'}</td>
                                <td>${valS38 && referencia ? (Math.abs(valS38 - referencia) > 1 ? 
                                    `<span class="text-danger">+${Math.abs(valS38 - referencia).toFixed(2)} Bs</span>` : 
                                    `<span class="text-success">±${Math.abs(valS38 - referencia).toFixed(2)} Bs</span>`) : '-'}</td>
                                <td><span class="badge bg-danger">O(h⁴)</span></td>
                                <td>${valS38 ? '<i class="fas fa-check-circle text-success"></i>' : 
                                    '<i class="fas fa-times-circle text-danger" title="Requiere múltiplo de 3"></i>'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>`;

    // ================================================================
    // SECCIÓN 6: GRÁFICO
    // ================================================================
    html += `
    <div class="mb-4 fade-in">
        <div class="d-flex align-items-center mb-3">
            <span class="seccion-numero me-3">6</span>
            <h4 class="fw-bold text-dark mb-0">
                <i class="fas fa-chart-area text-${colorMetodo} me-2"></i>
                Gráfico de Integración — ${nombreMetodo}
            </h4>
        </div>
        <div class="card border-0 shadow-sm">
            <div class="card-body p-4">
                <div class="chart-container">
                    <canvas id="grafico-${metodoId}"></canvas>
                </div>
                <div class="mt-3 d-flex flex-wrap gap-3 justify-content-center small">
                    <span><i class="fas fa-square me-1" style="color:#d91438"></i>Curva de Precios</span>
                    <span><i class="fas fa-square me-1" style="color:#a68a8a"></i>Precio Estable</span>
                    <span><i class="fas fa-square me-1" style="color:${metodoId === 'trapecio' ? 'rgba(13,110,253,0.2)' : metodoId === 'simpson13' ? 'rgba(25,135,84,0.2)' : 'rgba(220,53,69,0.2)'}"></i>Área Integrada</span>
                    ${puntoCritico ? '<span><i class="fas fa-star me-1 text-danger"></i>Punto Crítico</span>' : ''}
                </div>
            </div>
        </div>
    </div>`;

    // ================================================================
    // SECCIÓN 7: EXPLICACIÓN DEL ALGORITMO
    // ================================================================
    html += `
    <div class="mb-4 fade-in">
        <div class="d-flex align-items-center mb-3">
            <span class="seccion-numero me-3">7</span>
            <h4 class="fw-bold text-dark mb-0">
                <i class="fas fa-code text-${colorMetodo} me-2"></i>
                Explicación del Algoritmo — ${nombreMetodo}
            </h4>
        </div>
        <div class="card border-0 shadow-sm bg-light">
            <div class="card-body">`;

    if (metodoId === 'trapecio') {
        html += `
                <h5 class="fw-bold text-primary">Regla del Trapecio Compuesta</h5>
                <p>La <strong>Regla del Trapecio</strong> aproxima el área bajo la curva dividiendo el intervalo 
                   en <strong>trapecios</strong> de ancho constante <em>h</em> y sumando sus áreas individuales.</p>
                <div class="math-formula trapecio">
                    <p class="mb-1 fw-bold text-center">∫ f(x)dx ≈ (h/2)[f(x₀) + 2f(x₁) + 2f(x₂) + ... + 2f(xₙ₋₁) + f(xₙ)]</p>
                    <p class="mb-0 small text-center text-muted">
                        Error de truncamiento: E = −(b−a)h²f″(ξ)/12 &nbsp;|&nbsp; Orden: <strong>O(h²)</strong>
                    </p>
                </div>
                <p><strong>Ventaja:</strong> Funciona con <strong>cualquier número de intervalos</strong>. Es el método más simple de implementar.</p>
                <p><strong>Desventaja:</strong> Menor precisión que Simpson. Requiere muchos intervalos para funciones con curvatura pronunciada.</p>
                <p class="mb-0"><strong>Caso de uso:</strong> Ideal cuando no se puede garantizar un número par de intervalos o como primera aproximación rápida.</p>`;
    } else if (metodoId === 'simpson13') {
        html += `
                <h5 class="fw-bold text-success">Regla de Simpson 1/3 Compuesta</h5>
                <p>La <strong>Regla de Simpson 1/3</strong> ajusta <strong>parábolas</strong> (polinomios de grado 2) 
                   a pares consecutivos de subintervalos, logrando una aproximación mucho más precisa.</p>
                <div class="math-formula simpson13">
                    <p class="mb-1 fw-bold text-center">∫ f(x)dx ≈ (h/3)[f(x₀) + 4f(x₁) + 2f(x₂) + 4f(x₃) + ... + 2f(xₙ₋₂) + 4f(xₙ₋₁) + f(xₙ)]</p>
                    <p class="mb-0 small text-center text-muted">
                        Patrón de coeficientes: 1, 4, 2, 4, 2, ..., 4, 1 &nbsp;|&nbsp; Error: E = −(b−a)h⁴f⁽⁴⁾(ξ)/180 &nbsp;|&nbsp; Orden: <strong>O(h⁴)</strong>
                    </p>
                </div>
                <p><strong>Ventaja:</strong> Alta precisión (O(h⁴)) con relativamente pocos intervalos. Es el <strong>estándar en ingeniería</strong>.</p>
                <p><strong>Desventaja:</strong> Requiere un <strong>número PAR de intervalos</strong> (número impar de puntos).</p>
                <p class="mb-0"><strong>Caso de uso:</strong> Recomendado como <strong>método de referencia</strong> para curvas suaves con suficientes puntos.</p>`;
    } else {
        html += `
                <h5 class="fw-bold text-danger">Regla de Simpson 3/8 Compuesta</h5>
                <p>La <strong>Regla de Simpson 3/8</strong> utiliza <strong>polinomios cúbicos</strong> (grado 3) 
                   sobre grupos de 3 subintervalos, ofreciendo otra alternativa de alta precisión.</p>
                <div class="math-formula simpson38">
                    <p class="mb-1 fw-bold text-center">∫ f(x)dx ≈ (3h/8)[f(x₀) + 3f(x₁) + 3f(x₂) + 2f(x₃) + ... + 3f(xₙ₋₁) + f(xₙ)]</p>
                    <p class="mb-0 small text-center text-muted">
                        Patrón de coeficientes: 1, 3, 3, 2, 3, 3, 2, ..., 3, 3, 1 &nbsp;|&nbsp; Error: E = −(b−a)h⁴f⁽⁴⁾(ξ)/80 &nbsp;|&nbsp; Orden: <strong>O(h⁴)</strong>
                    </p>
                </div>
                <p><strong>Ventaja:</strong> Misma precisión O(h⁴) que Simpson 1/3. Útil cuando el número de intervalos es múltiplo de 3.</p>
                <p><strong>Desventaja:</strong> Requiere <strong>múltiplo de 3 intervalos</strong>. Ligeramente más complejo que Simpson 1/3.</p>
                <p class="mb-0"><strong>Caso de uso:</strong> Complementa a Simpson 1/3 cuando el número de puntos no es compatible con este último.</p>`;
    }

    html += `</div></div></div>`;

    // ================================================================
    // SECCIÓN 8: INTERPRETACIÓN DE RESULTADOS
    // ================================================================
    html += `
    <div class="mb-4 fade-in">
        <div class="d-flex align-items-center mb-3">
            <span class="seccion-numero me-3">8</span>
            <h4 class="fw-bold text-dark mb-0">
                <i class="fas fa-lightbulb text-${colorMetodo} me-2"></i>
                Interpretación de Resultados — ${nombreMetodo}
            </h4>
        </div>
        <div class="card border-0 shadow-sm">
            <div class="card-body">
                <ul class="list-group list-group-flush">`;

    // 1. Gasto mensual
    html += `
        <li class="list-group-item">
            <i class="fas fa-receipt text-${colorMetodo} me-2"></i>
            <strong>¿Cuánto gastó una familia durante el mes?</strong><br>
            <span class="text-muted">
                El gasto total estimado por <strong>${nombreMetodo}</strong> es de 
                <strong class="text-${colorMetodo}">Bs ${valorIntegral.toFixed(2)}</strong> 
                en ${dias} días, equivalente a <strong>Bs ${(valorIntegral / dias).toFixed(2)}/día</strong> en promedio.
            </span>
        </li>`;

    // 2. Sin inflación
    html += `
        <li class="list-group-item">
            <i class="fas fa-coins text-secondary me-2"></i>
            <strong>¿Cuánto hubiera gastado si los precios no subían?</strong><br>
            <span class="text-muted">
                Con precios estables: <strong>Bs ${costoEstable.toFixed(2)}</strong>. 
                El sobrecosto por inflación fue de <strong class="text-danger">Bs ${(valorIntegral - costoEstable).toFixed(2)}</strong> 
                (+${((valorIntegral - costoEstable) / costoEstable * 100).toFixed(1)}% adicional).
            </span>
        </li>`;

    // 3. Pérdida de poder adquisitivo
    html += `
        <li class="list-group-item">
            <i class="fas fa-chart-line-down ${perdida > 25 ? 'text-danger' : 'text-warning'} me-2"></i>
            <strong>¿Cuál fue la pérdida aproximada del poder adquisitivo?</strong><br>
            <span class="text-muted">
                La inflación consumió <strong class="${perdida > 25 ? 'text-danger' : 'text-warning'}">${Math.abs(perdida).toFixed(1)}%</strong> 
                del ingreso familiar (Bs ${ingreso}). 
                ${perdida > 25 ? '<strong class="text-danger">⚠️ Impacto severo:</strong> más de un cuarto del ingreso se perdió por la crisis.' : 
                perdida > 10 ? '<strong class="text-warning">⚠️ Impacto moderado:</strong> se requiere ajuste presupuestario.' : 
                '<strong class="text-success">Impacto manejable</strong> dentro de los márgenes familiares.'}
            </span>
        </li>`;

    // 4. Precisión del método
    html += `
        <li class="list-group-item">
            <i class="fas fa-balance-scale text-info me-2"></i>
            <strong>¿Qué método de integración fue más preciso?</strong><br>
            <span class="text-muted">
                <strong>Simpson 1/3 y Simpson 3/8</strong> (O(h⁴)) son significativamente más precisos que 
                <strong>Trapecio</strong> (O(h²)). Para esta función de inflación con curvatura suave, 
                ${valS13 ? 'Simpson 1/3 ofrece la mejor relación precisión/simplicidad.' : 
                'al no estar disponible Simpson 1/3, se recomienda usar el método disponible de mayor orden.'}
            </span>
        </li>`;

    // 5. Producto que más afectó
    html += `
        <li class="list-group-item">
            <i class="fas fa-exclamation-triangle text-danger me-2"></i>
            <strong>¿Qué afectó más al gasto mensual?</strong><br>
            <span class="text-muted">
                La <strong>tasa de incremento k = ${tasa}</strong> es el factor determinante. 
                Con k=${tasa}, el precio final es <strong>Bs ${puntos[puntos.length-1].y.toFixed(2)}</strong> 
                (${((puntos[puntos.length-1].y - base) / base * 100).toFixed(1)}% mayor que el inicial). 
                Reducir k a la mitad disminuiría la pérdida en aproximadamente un ${(perdida * 0.6).toFixed(1)}%.
            </span>
        </li>`;

    html += `</ul></div></div></div>`;

    container.innerHTML = html;

    // Dibujar gráfico
    setTimeout(() => crearGrafico(metodoId, puntos, base, puntoCritico, colorMetodo), 50);
}

// ======================================================================
// 5. CREACIÓN DE GRÁFICOS
// ======================================================================
function crearGrafico(metodoId, puntos, base, puntoCritico, colorMetodo) {
    const canvas = document.getElementById(`grafico-${metodoId}`);
    if (!canvas) return;
    
    if (graficos[metodoId]) graficos[metodoId].destroy();
    
    const ctx = canvas.getContext('2d');
    const labels = puntos.map(p => p.x);
    const precios = puntos.map(p => p.y);
    const estables = puntos.map(() => base);
    
    // Punto crítico
    let datosCritico = new Array(puntos.length).fill(null);
    if (puntoCritico) {
        datosCritico[puntoCritico.dia] = puntoCritico.precio;
    }
    
    // Color de área según método
    const colorArea = metodoId === 'trapecio' ? 'rgba(13,110,253,0.2)' :
                      metodoId === 'simpson13' ? 'rgba(25,135,84,0.2)' : 'rgba(220,53,69,0.2)';
    const colorLinea = metodoId === 'trapecio' ? '#0d6efd' :
                       metodoId === 'simpson13' ? '#198754' : '#dc3545';
    
    graficos[metodoId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Curva de Precios',
                    data: precios,
                    borderColor: '#d91438',
                    backgroundColor: colorArea,
                    fill: true,
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    order: 2
                },
                {
                    label: 'Precio Estable (sin inflación)',
                    data: estables,
                    borderColor: '#a68a8a',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    order: 1
                },
                {
                    label: puntoCritico ? `Punto Crítico (Día ${puntoCritico.dia})` : 'Sin Punto Crítico',
                    data: datosCritico,
                    backgroundColor: '#ff0000',
                    borderColor: '#fff',
                    borderWidth: 3,
                    pointRadius: 14,
                    pointStyle: 'star',
                    pointHoverRadius: 18,
                    showLine: false,
                    order: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, padding: 15 } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.label.includes('Crítico')) {
                                return `⚠️ Día ${context.parsed.x}: Precio = Bs ${context.parsed.y.toFixed(2)}`;
                            }
                            return `${context.dataset.label}: Bs ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Día del Mes', font: { weight: 'bold', size: 14 } },
                    grid: { color: '#f0f0f0' }
                },
                y: {
                    title: { display: true, text: 'Precio Diario (Bs)', font: { weight: 'bold', size: 14 } },
                    grid: { color: '#f0f0f0' },
                    beginAtZero: false
                }
            }
        }
    });
}

// ======================================================================
// 6. UTILIDADES DE UI
// ======================================================================
function mostrarEstado(texto, tipo) {
    const box = document.getElementById('mensajeEstado');
    box.textContent = texto;
    box.className = `alert alert-${tipo} mt-3 py-2 small`;
    box.classList.remove('d-none');
    if (tipo !== 'danger') {
        setTimeout(() => box.classList.add('d-none'), 6000);
    }
}

function restaurarValores() {
    document.getElementById('inputDias').value = valoresPorDefecto.dias;
    document.getElementById('inputBase').value = valoresPorDefecto.base;
    document.getElementById('inputIngreso').value = valoresPorDefecto.ingreso;
    document.getElementById('inputTasa').value = valoresPorDefecto.tasa;
    dispararCalculo();
}

// ======================================================================
// 7. CONFIGURACIÓN DE EVENTOS Y ARRANQUE
// ======================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Listeners de inputs
    document.querySelectorAll('#inputDias, #inputBase, #inputIngreso, #inputTasa').forEach(el => {
        el.addEventListener('input', dispararCalculo);
    });
    
    // Botones
    document.getElementById('btnEjecutar').addEventListener('click', () => dispararCalculo());
    document.getElementById('btnRestaurar').addEventListener('click', restaurarValores);
    
    // Al cambiar de pestaña, redibujar gráfico
    document.querySelectorAll('[data-coreui-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.coreui.tab', (e) => {
            const targetId = e.target.getAttribute('data-coreui-target').replace('#', '');
            setTimeout(() => {
                const canvas = document.getElementById(`grafico-${targetId}`);
                if (canvas && graficos[targetId]) {
                    graficos[targetId].resize();
                }
            }, 100);
        });
    });

    // Ejecutar cálculo inicial
    dispararCalculo();
});