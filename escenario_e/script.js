// ======================================================================
// MÓDULO E: RAÍCES DE ECUACIONES - MOTOR COMPLETO
// ======================================================================
let graficos = {
    biseccion: null,
    newton: null,
    secante: null
};

let debounceTimerGlobal = null;
let calculoEnProgreso = false;

// ======================================================================
// 1. DEFINICIÓN DE FUNCIONES DEL MODELO
// ======================================================================

function definirFuncion(tipo) {
    const funciones = {
        costo: {
            f: (x) => {
                const base = 85, k = 0.18, T = 30, ingreso = 4200;
                if (x <= 0) return -ingreso;
                const costo = base * x * (1 + k * Math.pow(x / T, 1.5));
                return costo - ingreso;
            },
            df: (x) => {
                const base = 85, k = 0.18, T = 30;
                if (x <= 0) return base;
                return base * (1 + k * Math.pow(x / T, 1.5)) + base * x * k * 1.5 * Math.pow(x / T, 0.5) / T;
            },
            label: 'Costo Acumulado - Ingreso Familiar',
            nombre: '💰 Día Crítico de Gasto',
            descripcion: 'Encuentra el día donde el gasto acumulado iguala el ingreso familiar (Bs 4,200)',
            a: 1, b: 40,
            xLabel: 'Días transcurridos',
            yLabel: 'Costo - Ingreso (Bs)',
            contexto: 'económico',
            unidadRaiz: 'días',
            interpretacionRaiz: (r) => `La familia agota su ingreso el <strong>día ${r.toFixed(2)}</strong>. 
                Antes de este punto hay superávit; después, déficit acumulado.`
        },
        reposicion: {
            f: (r) => {
                if (r <= 0) return -120;
                return r - (120 / (1 + 0.05 * r));
            },
            df: (r) => {
                if (r <= 0) return 1;
                return 1 + (120 * 0.05) / Math.pow(1 + 0.05 * r, 2);
            },
            label: 'Tasa Reposición - Consumo Crítico',
            nombre: '⛽ Tasa Crítica de Reposición',
            descripcion: 'Determina la tasa mínima de reposición que iguala el consumo crítico de combustible',
            a: 5, b: 50,
            xLabel: 'Tasa de Reposición (unidades/día)',
            yLabel: 'Reposición - Consumo',
            contexto: 'logístico',
            unidadRaiz: 'unidades/día',
            interpretacionRaiz: (r) => `La tasa crítica de reposición es <strong>r = ${r.toFixed(4)} unidades/día</strong>. 
                Por debajo, los inventarios disminuyen; por encima, se acumulan.`
        },
        opinion: {
            f: (p) => {
                if (p < 0 || p > 1) return NaN;
                return 0.8 * p * (1 - p) * (p - 0.65) - 0.02;
            },
            df: (p) => {
                return 0.8 * (3 * p * p - 3.3 * p + 0.65);
            },
            label: 'Modelo de Opinión Social',
            nombre: '👥 Umbral de Masificación Social',
            descripcion: 'Calcula la proporción de población necesaria para que una opinión se vuelva mayoritaria',
            a: 0, b: 1,
            xLabel: 'Proporción de la Población (p)',
            yLabel: 'Fuerza de Opinión',
            contexto: 'social',
            unidadRaiz: '(proporción)',
            interpretacionRaiz: (r) => `El umbral crítico es <strong>p = ${r.toFixed(4)}</strong> 
                (${(r*100).toFixed(1)}% de la población). Al superar este valor, la opinión se masifica exponencialmente.`
        }
    };
    return funciones[tipo] || funciones.costo;
}

// ======================================================================
// 2. ALGORITMOS DE BÚSQUEDA DE RAÍCES (RIGUROSIDAD MATEMÁTICA)
// ======================================================================

/**
 * Método de Bisección (Bolzano)
 * Orden de convergencia: Lineal O(h)
 * Ventaja: Siempre converge si f(a)·f(b) < 0
 * Desventaja: Lento, requiere intervalo con cambio de signo
 */
function biseccion(f, a, b, tol, maxIter = 100) {
    const historial = [];
    const fa = f(a);
    const fb = f(b);

    if (fa * fb >= 0) {
        return { raiz: null, iteraciones: 0, historial, error: "No hay cambio de signo en [a,b]" };
    }

    let left = a, right = b;

    for (let i = 0; i < maxIter; i++) {
        const c = (left + right) / 2;
        const fc = f(c);
        const error = (right - left) / 2;

        historial.push({ iter: i + 1, x: c, fx: fc, error });

        if (Math.abs(fc) < tol || error < tol) {
            return { raiz: c, iteraciones: i + 1, historial, error: null };
        }

        if (fa * fc < 0) {
            right = c;
        } else {
            left = c;
        }
    }
    return { raiz: (left + right) / 2, iteraciones: maxIter, historial, error: "Máx. iteraciones alcanzado" };
}

/**
 * Método de Newton-Raphson
 * Orden de convergencia: Cuadrático O(h²)
 * Ventaja: Muy rápido cerca de la raíz
 * Desventaja: Requiere derivada, sensible a x₀
 */
function newtonRaphson(f, df, x0, tol, maxIter = 50) {
    const historial = [];
    let x = x0;

    for (let i = 0; i < maxIter; i++) {
        const fx = f(x);
        const dfx = df(x);

        if (Math.abs(dfx) < 1e-12) {
            return { raiz: null, iteraciones: i, historial, error: "Derivada cercana a cero" };
        }

        const xNew = x - fx / dfx;
        const error = Math.abs(xNew - x);
        const fxNew = f(xNew);

        historial.push({ iter: i + 1, x: xNew, fx: fxNew, error });

        if (Math.abs(fxNew) < tol || error < tol) {
            return { raiz: xNew, iteraciones: i + 1, historial, error: null };
        }

        x = xNew;
    }
    return { raiz: null, iteraciones: maxIter, historial, error: "No convergió en máx. iteraciones" };
}

/**
 * Método de la Secante
 * Orden de convergencia: Superlineal ~O(h^1.618)
 * Ventaja: No requiere derivada
 * Desventaja: Necesita dos puntos iniciales
 */
function secante(f, x0, x1, tol, maxIter = 50) {
    const historial = [];
    let xPrev = x0, xCurr = x1;

    for (let i = 0; i < maxIter; i++) {
        const fPrev = f(xPrev);
        const fCurr = f(xCurr);

        if (Math.abs(fCurr - fPrev) < 1e-12) {
            return { raiz: null, iteraciones: i, historial, error: "Diferencia finita ~ 0" };
        }

        const xNext = xCurr - fCurr * (xCurr - xPrev) / (fCurr - fPrev);
        const error = Math.abs(xNext - xCurr);
        const fxNext = f(xNext);

        historial.push({ iter: i + 1, x: xNext, fx: fxNext, error });

        if (Math.abs(fxNext) < tol || error < tol) {
            return { raiz: xNext, iteraciones: i + 1, historial, error: null };
        }

        xPrev = xCurr;
        xCurr = xNext;
    }
    return { raiz: null, iteraciones: maxIter, historial, error: "No convergió en máx. iteraciones" };
}

/** Estimar orden de convergencia a partir del historial */
function estimarOrdenConvergencia(historial) {
    if (!historial || historial.length < 4) return null;
    const n = historial.length;
    const e1 = Math.max(historial[n-3].error, 1e-15);
    const e2 = Math.max(historial[n-2].error, 1e-15);
    const e3 = Math.max(historial[n-1].error, 1e-15);
    const p = Math.log(e3 / e2) / Math.log(e2 / e1);
    return isFinite(p) ? Math.max(0.5, Math.min(3, p)) : null;
}

// ======================================================================
// 3. ORQUESTACIÓN DE CÁLCULOS Y RENDERIZADO
// ======================================================================

function dispararCalculo() {
    if (calculoEnProgreso) return;
    clearTimeout(debounceTimerGlobal);
    debounceTimerGlobal = setTimeout(() => ejecutarTodosLosMetodos(), 400);
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

    await new Promise(r => setTimeout(r, 50));
    progressBar.style.width = '25%';

    try {
        const tipo = document.getElementById('funcSelect').value;
        const modelo = definirFuncion(tipo);
        let a = parseFloat(document.getElementById('inputA').value);
        let b = parseFloat(document.getElementById('inputB').value);
        let x0 = parseFloat(document.getElementById('inputX0').value);
        const tol = parseFloat(document.getElementById('inputTol').value) || 0.0001;

        if (isNaN(a)) a = modelo.a;
        if (isNaN(b)) b = modelo.b;
        if (isNaN(x0)) x0 = (a + b) / 2;
        if (a >= b) throw new Error("El valor de 'a' debe ser menor que 'b'.");

        await new Promise(r => setTimeout(r, 50));
        progressBar.style.width = '50%';

        // Ejecutar los 3 métodos
        const resBis = biseccion(modelo.f, a, b, tol);
        const resNew = newtonRaphson(modelo.f, modelo.df, x0, tol);
        const x1 = x0 + 0.5;
        const resSec = secante(modelo.f, x0, x1, tol);

        // Estimar órdenes de convergencia
        const ordenBis = estimarOrdenConvergencia(resBis.historial);
        const ordenNew = estimarOrdenConvergencia(resNew.historial);
        const ordenSec = estimarOrdenConvergencia(resSec.historial);

        await new Promise(r => setTimeout(r, 50));
        progressBar.style.width = '75%';

        // Determinar raíz principal
        let raizPrincipal = null;
        if (resNew.raiz !== null && isFinite(resNew.raiz)) raizPrincipal = resNew.raiz;
        else if (resBis.raiz !== null && isFinite(resBis.raiz)) raizPrincipal = resBis.raiz;
        else if (resSec.raiz !== null && isFinite(resSec.raiz)) raizPrincipal = resSec.raiz;

        // Generar contenido para cada método
        const metodos = [
            { id: 'biseccion', nombre: 'Bisección', res: resBis, orden: ordenBis, color: 'primary', icono: 'fa-divide', ordenTeorico: 'Lineal O(h)' },
            { id: 'newton', nombre: 'Newton-Raphson', res: resNew, orden: ordenNew, color: 'success', icono: 'fa-superscript', ordenTeorico: 'Cuadrático O(h²)' },
            { id: 'secante', nombre: 'Secante', res: resSec, orden: ordenSec, color: 'danger', icono: 'fa-exchange-alt', ordenTeorico: 'Superlineal ~O(h^1.618)' }
        ];

        metodos.forEach(m => {
            generarContenidoCompleto(m.id, m.nombre, m.res, m.orden, m.color, m.icono, m.ordenTeorico, modelo, a, b, tol);
        });

        progressBar.style.width = '100%';
        mostrarEstado('✅ Búsqueda de raíces completada para los 3 métodos.', 'success');

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

function generarContenidoCompleto(metodoId, nombreMetodo, resultado, ordenEstimado, colorMetodo, iconoMetodo, ordenTeorico, modelo, a, b, tol) {
    const container = document.getElementById(`contenido-${metodoId}`);
    if (!container) return;

    const convergio = resultado.raiz !== null && isFinite(resultado.raiz);
    let html = '';

    if (!convergio && resultado.error) {
        html = `
        <div class="alert ${resultado.error.includes('cambio de signo') ? 'alert-warning' : 'alert-danger'} m-4 fade-in">
            <i class="fas fa-exclamation-triangle me-2"></i>
            <strong>${nombreMetodo}:</strong> ${resultado.error}
            ${resultado.error.includes('cambio de signo') ? '<br>Intente con un intervalo donde f(a)·f(b) &lt; 0.' : '<br>Intente con otra condición inicial o ajuste la tolerancia.'}
        </div>`;
        container.innerHTML = html;
        return;
    }

    const raiz = resultado.raiz;
    const iteraciones = resultado.iteraciones;
    const historial = resultado.historial;

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
            <div class="col-md-4">
                <div class="card card-resultado shadow-sm h-100" style="border-top: 4px solid var(--bs-${colorMetodo})">
                    <div class="card-body text-center">
                        <i class="fas fa-bullseye fs-1 text-${colorMetodo} mb-2 d-block"></i>
                        <h6 class="text-muted small mb-2">Raíz Encontrada</h6>
                        <h2 class="fw-bold text-${colorMetodo} mb-1">x = ${raiz.toFixed(8)}</h2>
                        <small class="text-muted">${modelo.unidadRaiz}</small>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card card-resultado shadow-sm h-100" style="border-top: 4px solid #ff9f1c">
                    <div class="card-body text-center">
                        <i class="fas fa-tachometer-alt fs-1 text-warning mb-2 d-block"></i>
                        <h6 class="text-muted small mb-2">Iteraciones</h6>
                        <h2 class="fw-bold text-warning mb-1">${iteraciones}</h2>
                        <small class="text-muted">con tolerancia ε = ${tol}</small>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card card-resultado shadow-sm h-100" style="border-top: 4px solid #6a0dad">
                    <div class="card-body text-center">
                        <i class="fas fa-chart-line fs-1 text-info mb-2 d-block"></i>
                        <h6 class="text-muted small mb-2">Orden de Convergencia</h6>
                        <h2 class="fw-bold text-info mb-1">${ordenEstimado ? ordenEstimado.toFixed(4) : 'N/A'}</h2>
                        <small class="text-muted">Teórico: ${ordenTeorico}</small>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row g-3 mt-2">
            <div class="col-md-6">
                <div class="card bg-light border-0 shadow-sm h-100">
                    <div class="card-body">
                        <h6 class="fw-bold text-dark">
                            <i class="fas fa-check-circle text-${colorMetodo} me-2"></i>
                            Valor de f(raíz)
                        </h6>
                        <p class="mb-0">
                            f(${raiz.toFixed(6)}) = <strong class="fw-mono">${resultado.historial[resultado.historial.length-1].fx.toExponential(6)}</strong>
                        </p>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card bg-light border-0 shadow-sm h-100">
                    <div class="card-body">
                        <h6 class="fw-bold text-dark">
                            <i class="fas fa-ruler text-${colorMetodo} me-2"></i>
                            Error Final Estimado
                        </h6>
                        <p class="mb-0">
                            |x_{${iteraciones}} - x_{${iteraciones-1}}| = <strong class="fw-mono">${historial[historial.length-1].error.toExponential(4)}</strong>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    // ================================================================
    // SECCIÓN 5: TABLA DE ITERACIONES
    // ================================================================
    html += `
    <div class="mb-4 fade-in">
        <div class="d-flex align-items-center mb-3">
            <span class="seccion-numero me-3">5</span>
            <h4 class="fw-bold text-dark mb-0">
                <i class="fas fa-table text-${colorMetodo} me-2"></i>
                Tabla de Iteraciones — ${nombreMetodo}
            </h4>
        </div>
        <div class="card border-0 shadow-sm">
            <div class="card-body p-0">
                <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                    <table class="table table-hover table-sm mb-0">
                        <thead class="bg-light sticky-top">
                            <tr>
                                <th class="py-2"># Iter</th>
                                <th class="py-2">x (aproximación)</th>
                                <th class="py-2">f(x)</th>
                                <th class="py-2">Error |xᵢ - xᵢ₋₁|</th>
                            </tr>
                        </thead>
                        <tbody>`;

    historial.forEach((h, idx) => {
        const rowClass = idx === historial.length - 1 ? 'table-active fw-bold' : '';
        html += `
            <tr class="${rowClass}">
                <td class="text-center"><span class="badge bg-${colorMetodo}">${h.iter}</span></td>
                <td class="fw-mono">${h.x.toFixed(10)}</td>
                <td class="fw-mono ${Math.abs(h.fx) < tol ? 'text-success' : ''}">${h.fx.toExponential(8)}</td>
                <td class="fw-mono">${h.error.toExponential(6)}</td>
            </tr>`;
    });

    html += `</tbody></table></div></div></div>`;

    // ================================================================
    // SECCIÓN 6: GRÁFICO
    // ================================================================
    html += `
    <div class="mb-4 fade-in">
        <div class="d-flex align-items-center mb-3">
            <span class="seccion-numero me-3">6</span>
            <h4 class="fw-bold text-dark mb-0">
                <i class="fas fa-chart-area text-${colorMetodo} me-2"></i>
                Gráfico de Convergencia — ${nombreMetodo}
            </h4>
        </div>
        <div class="card border-0 shadow-sm">
            <div class="card-body p-4">
                <div class="chart-container">
                    <canvas id="grafico-${metodoId}"></canvas>
                </div>
                <div class="mt-3 d-flex flex-wrap gap-3 justify-content-center small">
                    <span><i class="fas fa-square me-1" style="color:#d91438"></i>f(x)</span>
                    <span><i class="fas fa-minus me-1" style="color:#6c757d"></i>Eje y=0</span>
                    <span><i class="fas fa-star me-1 text-danger"></i>Raíz encontrada</span>
                    <span><i class="fas fa-circle me-1" style="color:${metodoId === 'biseccion' ? '#0d6efd' : metodoId === 'newton' ? '#198754' : '#dc3545'}"></i>Iteraciones</span>
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

    if (metodoId === 'biseccion') {
        html += `
                <h5 class="fw-bold text-primary">Método de Bisección (Bolzano)</h5>
                <p>El método de <strong>bisección</strong> es un algoritmo de búsqueda de raíces que divide repetidamente 
                   un intervalo a la mitad, seleccionando el subintervalo donde la función cambia de signo.</p>
                <div class="math-formula biseccion">
                    <p class="mb-1 fw-bold text-center">c = (a + b) / 2</p>
                    <p class="mb-0 small text-center text-muted">
                        Si f(a)·f(c) &lt; 0 → b = c &nbsp;|&nbsp; Si f(c)·f(b) &lt; 0 → a = c<br>
                        Error: |b-a|/2ⁿ &nbsp;|&nbsp; Orden: <strong>Lineal O(h)</strong>
                    </p>
                </div>
                <p><strong>Ventaja:</strong> <span class="text-success">Siempre converge</span> si f(a)·f(b) &lt; 0. Es el método más <strong>robusto</strong>.</p>
                <p><strong>Desventaja:</strong> Convergencia <strong>lenta</strong> (lineal). Requiere ~3.3 iteraciones por cada dígito decimal de precisión.</p>
                <p class="mb-0"><strong>Caso de uso:</strong> Ideal para obtener un intervalo inicial que contenga la raíz, o cuando otros métodos fallan.</p>`;
    } else if (metodoId === 'newton') {
        html += `
                <h5 class="fw-bold text-success">Método de Newton-Raphson</h5>
                <p>El método de <strong>Newton-Raphson</strong> utiliza la recta tangente en cada punto para aproximar 
                   la raíz, logrando convergencia cuadrática cerca de la solución.</p>
                <div class="math-formula newton">
                    <p class="mb-1 fw-bold text-center">x_{n+1} = x_n − f(x_n) / f'(x_n)</p>
                    <p class="mb-0 small text-center text-muted">
                        Requiere: f'(x) ≠ 0 &nbsp;|&nbsp; Error: |x_{n+1} − x_n| &nbsp;|&nbsp; Orden: <strong>Cuadrático O(h²)</strong>
                    </p>
                </div>
                <p><strong>Ventaja:</strong> <span class="text-success">Convergencia cuadrática</span>: duplica los dígitos correctos en cada iteración cerca de la raíz.</p>
                <p><strong>Desventaja:</strong> Requiere calcular <strong>f'(x)</strong>. Muy <strong>sensible a la condición inicial</strong> x₀. Puede divergir si x₀ está lejos.</p>
                <p class="mb-0"><strong>Caso de uso:</strong> Método preferido cuando se dispone de una buena aproximación inicial y la derivada es conocida.</p>`;
    } else {
        html += `
                <h5 class="fw-bold text-danger">Método de la Secante</h5>
                <p>El método de la <strong>secante</strong> aproxima la derivada usando diferencias finitas, evitando 
                   la necesidad de calcular f'(x) analíticamente.</p>
                <div class="math-formula secante">
                    <p class="mb-1 fw-bold text-center">x_{n+1} = x_n − f(x_n) · (x_n − x_{n-1}) / (f(x_n) − f(x_{n-1}))</p>
                    <p class="mb-0 small text-center text-muted">
                        Requiere: f(x_n) ≠ f(x_{n-1}) &nbsp;|&nbsp; Orden: <strong>Superlineal ~O(h^1.618)</strong>
                    </p>
                </div>
                <p><strong>Ventaja:</strong> <span class="text-success">No requiere derivada</span>. Convergencia superlineal (más rápida que Bisección, casi tan rápida como Newton).</p>
                <p><strong>Desventaja:</strong> Necesita <strong>dos puntos iniciales</strong>. Puede fallar si la secante es casi horizontal.</p>
                <p class="mb-0"><strong>Caso de uso:</strong> Alternativa robusta a Newton cuando la derivada es difícil de calcular o no está disponible.</p>`;
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
                <ul class="list-group list-group-flush">
                    <li class="list-group-item">
                        <i class="fas fa-bullseye text-${colorMetodo} me-2"></i>
                        <strong>¿Cuál es el punto crítico encontrado?</strong><br>
                        <span class="text-muted">${modelo.interpretacionRaiz(raiz)}</span>
                    </li>
                    <li class="list-group-item">
                        <i class="fas fa-tachometer-alt text-warning me-2"></i>
                        <strong>Velocidad de convergencia:</strong><br>
                        <span class="text-muted">
                            ${nombreMetodo} convergió en <strong>${iteraciones} iteraciones</strong> 
                            con tolerancia ε = ${tol}. 
                            Orden estimado: <strong>${ordenEstimado ? ordenEstimado.toFixed(4) : 'N/A'}</strong> 
                            (teórico: ${ordenTeorico}).
                        </span>
                    </li>
                    <li class="list-group-item">
                        <i class="fas fa-shield-alt ${convergio ? 'text-success' : 'text-danger'} me-2"></i>
                        <strong>Robustez del método:</strong><br>
                        <span class="text-muted">
                            ${metodoId === 'biseccion' ? 
                                'Bisección es el <strong>método más robusto</strong>: siempre converge si hay cambio de signo. Es ideal como referencia.' :
                            metodoId === 'newton' ? 
                                'Newton-Raphson es <strong>muy rápido pero sensible</strong> a x₀. Si la condición inicial es adecuada, es imbatible en velocidad.' :
                                'La Secante ofrece un <strong>excelente equilibrio</strong>: casi tan rápida como Newton sin necesidad de derivada.'}
                        </span>
                    </li>
                    <li class="list-group-item">
                        <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                        <strong>Sensibilidad a condiciones iniciales:</strong><br>
                        <span class="text-muted">
                            ${metodoId === 'biseccion' ? 
                                'Bisección <strong>no depende</strong> de una condición inicial: solo requiere el intervalo [a,b] con cambio de signo.' :
                            metodoId === 'newton' ? 
                                'Newton-Raphson es <strong>altamente sensible</strong> a x₀. Si x₀ está lejos de la raíz o cerca de un punto donde f\'(x) ≈ 0, puede divergir.' :
                                'La Secante es <strong>moderadamente sensible</strong>. Necesita dos puntos iniciales pero es más tolerante que Newton.'}
                        </span>
                    </li>
                </ul>
            </div>
        </div>
    </div>`;

    container.innerHTML = html;

    // Dibujar gráfico
    setTimeout(() => crearGrafico(metodoId, modelo, a, b, raiz, historial, colorMetodo), 50);
}

// ======================================================================
// 5. CREACIÓN DE GRÁFICOS
// ======================================================================
function crearGrafico(metodoId, modelo, a, b, raiz, historial, colorMetodo) {
    const canvas = document.getElementById(`grafico-${metodoId}`);
    if (!canvas) return;

    if (graficos[metodoId]) graficos[metodoId].destroy();

    const ctx = canvas.getContext('2d');
    const colorLinea = metodoId === 'biseccion' ? '#0d6efd' : metodoId === 'newton' ? '#198754' : '#dc3545';
    const colorPunto = metodoId === 'biseccion' ? '#0d6efd' : metodoId === 'newton' ? '#198754' : '#dc3545';

    // Rango para graficar
    const margin = (b - a) * 0.15;
    const minX = a - margin;
    const maxX = b + margin;
    const paso = (maxX - minX) / 300;

    // Curva de la función
    const datosCurva = [];
    const datosCero = [];
    for (let x = minX; x <= maxX; x += paso) {
        const y = modelo.f(x);
        if (isFinite(y)) {
            datosCurva.push({ x, y });
            datosCero.push({ x, y: 0 });
        }
    }

    // Raíz
    const datosRaiz = (raiz !== null && isFinite(raiz)) ? [{ x: raiz, y: modelo.f(raiz) }] : [];

    // Iteraciones
    const datosIteraciones = historial
        .filter(h => isFinite(h.x) && isFinite(h.fx))
        .map(h => ({ x: h.x, y: h.fx }));

    graficos[metodoId] = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'f(x)',
                    data: datosCurva,
                    borderColor: '#d91438',
                    backgroundColor: 'rgba(217,20,56,0.05)',
                    fill: false,
                    tension: 0.3,
                    borderWidth: 2.5,
                    pointRadius: 0,
                    showLine: true,
                    order: 5
                },
                {
                    label: 'Eje y = 0',
                    data: datosCero,
                    borderColor: '#6c757d',
                    borderDash: [5, 5],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    showLine: true,
                    order: 4
                },
                {
                    label: '⭐ Raíz Encontrada',
                    data: datosRaiz,
                    backgroundColor: '#ff0000',
                    borderColor: '#fff',
                    borderWidth: 3,
                    pointRadius: 14,
                    pointStyle: 'star',
                    pointHoverRadius: 18,
                    showLine: false,
                    order: 0
                },
                {
                    label: `Iteraciones ${metodoId.charAt(0).toUpperCase() + metodoId.slice(1)}`,
                    data: datosIteraciones,
                    backgroundColor: colorPunto,
                    borderColor: colorPunto,
                    pointRadius: 7,
                    pointStyle: 'circle',
                    pointBorderWidth: 2,
                    pointBorderColor: '#fff',
                    showLine: false,
                    order: 1
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
                        label: function(ctx) {
                            if (ctx.dataset.label.includes('Raíz')) {
                                return `Raíz: x = ${ctx.parsed.x.toFixed(8)}, f(x) = ${ctx.parsed.y.toExponential(6)}`;
                            }
                            if (ctx.dataset.label.includes('Iteraciones')) {
                                return `Iteración: x = ${ctx.parsed.x.toFixed(8)}, f(x) = ${ctx.parsed.y.toExponential(6)}`;
                            }
                            return `f(${ctx.parsed.x.toFixed(4)}) = ${ctx.parsed.y.toExponential(6)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: modelo.xLabel, font: { weight: 'bold', size: 14 } },
                    grid: { color: '#f0f0f0' }
                },
                y: {
                    title: { display: true, text: modelo.yLabel, font: { weight: 'bold', size: 14 } },
                    grid: { color: '#f0f0f0' }
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

function actualizarIntervalosPorDefecto() {
    const tipo = document.getElementById('funcSelect').value;
    const modelo = definirFuncion(tipo);
    document.getElementById('inputA').value = modelo.a;
    document.getElementById('inputB').value = modelo.b;
    document.getElementById('inputX0').value = ((modelo.a + modelo.b) / 2).toFixed(2);
}

function restaurarValores() {
    actualizarIntervalosPorDefecto();
    document.getElementById('inputTol').value = '0.0001';
    dispararCalculo();
}

// ======================================================================
// 7. CONFIGURACIÓN DE EVENTOS Y ARRANQUE
// ======================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Listeners de inputs
    document.querySelectorAll('#inputA, #inputB, #inputX0, #inputTol, #funcSelect').forEach(el => {
        el.addEventListener('input', dispararCalculo);
        el.addEventListener('change', dispararCalculo);
    });
    
    document.getElementById('funcSelect').addEventListener('change', () => {
        actualizarIntervalosPorDefecto();
        dispararCalculo();
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