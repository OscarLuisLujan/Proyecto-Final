// ======================================================================
// MÓDULO C: INTERPOLACIÓN NUMÉRICA - MOTOR COMPLETO
// ======================================================================
let graficos = { lagrange: null, newton: null, spline: null };
const productos = ['carne', 'papa', 'pollo', 'arroz'];

const nombresProductos = {
    carne: 'Carne de Res',
    papa: 'Papa',
    pollo: 'Pollo',
    arroz: 'Arroz'
};

const emojisProductos = {
    carne: '🥩',
    papa: '🥔',
    pollo: '🍗',
    arroz: '🍚'
};

const coloresProductos = {
    carne: '#d91438',
    papa: '#ff9f1c',
    pollo: '#107869',
    arroz: '#6a0dad'
};

const datosPorDefecto = [
    { x: 1, carne: 82.00, papa: 8.00, pollo: 22.00, arroz: 7.50 },
    { x: 5, carne: 86.50, papa: 10.00, pollo: 24.50, arroz: 8.20 },
    { x: 10, carne: 93.00, papa: 13.00, pollo: 28.00, arroz: 9.00 },
    { x: 15, carne: 101.20, papa: 16.00, pollo: 32.50, arroz: 10.50 },
    { x: 20, carne: 109.80, papa: 19.00, pollo: 37.00, arroz: 12.00 },
    { x: 30, carne: 118.50, papa: 22.00, pollo: 42.00, arroz: 14.00 }
];

let debounceTimerGlobal = null;
let calculoEnProgreso = false;

// ======================================================================
// 1. INICIALIZACIÓN DE TABLA
// ======================================================================
function inicializarTabla() {
    const tbody = document.querySelector('#tablaDatos tbody');
    tbody.innerHTML = '';
    datosPorDefecto.forEach(p => agregarFilaDOM(p));
}

function agregarFilaDOM(datos = { x: 30, carne: 0, papa: 0, pollo: 0, arroz: 0 }) {
    const tbody = document.querySelector('#tablaDatos tbody');
    const fila = document.createElement('tr');
    fila.innerHTML = `
        <td><input type="number" class="form-control form-control-sm text-center input-x fw-bold" value="${datos.x}" step="any"></td>
        <td><input type="number" class="form-control form-control-sm text-center input-y" data-producto="carne" value="${datos.carne.toFixed(2)}" step="any"></td>
        <td><input type="number" class="form-control form-control-sm text-center input-y" data-producto="papa" value="${datos.papa.toFixed(2)}" step="any"></td>
        <td><input type="number" class="form-control form-control-sm text-center input-y" data-producto="pollo" value="${datos.pollo.toFixed(2)}" step="any"></td>
        <td><input type="number" class="form-control form-control-sm text-center input-y" data-producto="arroz" value="${datos.arroz.toFixed(2)}" step="any"></td>
        <td><button class="btn btn-sm btn-outline-danger btn-eliminar"><i class="fas fa-times"></i></button></td>
    `;
    tbody.appendChild(fila);

    fila.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', validarInputVisual);
    });
    fila.querySelector('.btn-eliminar').addEventListener('click', function () {
        eliminarFila(this);
    });
}

function agregarFila() {
    const inputsX = document.querySelectorAll('.input-x');
    let ultimoX = 30;
    if (inputsX.length > 0) {
        ultimoX = parseFloat(inputsX[inputsX.length - 1].value) || 30;
    }
    agregarFilaDOM({ x: ultimoX + 5, carne: 0, papa: 0, pollo: 0, arroz: 0 });
    dispararCalculo();
}

function eliminarFila(btn) {
    const filas = document.querySelectorAll('#tablaDatos tbody tr');
    if (filas.length <= 2) {
        mostrarEstado('⚠️ Se necesitan al menos 2 puntos para interpolar.', 'warning');
        return;
    }
    btn.closest('tr').remove();
    dispararCalculo();
}

function restaurarDatosPorDefecto() {
    document.querySelector('#tablaDatos tbody').innerHTML = '';
    datosPorDefecto.forEach(p => agregarFilaDOM(p));
    document.getElementById('diaEstimacion').value = 12;
    dispararCalculo();
}

// ======================================================================
// 2. VALIDACIÓN Y EXTRACCIÓN DE DATOS
// ======================================================================
function validarInputVisual(event) {
    const input = event.target;
    const val = input.value.trim();
    if (val === '' || isNaN(parseFloat(val))) {
        input.classList.add('input-error');
    } else {
        input.classList.remove('input-error');
    }
}

function obtenerDatosProducto(producto) {
    const filas = document.querySelectorAll('#tablaDatos tbody tr');
    const puntos = [];
    let datosInvalidos = false;

    filas.forEach(fila => {
        const inputX = fila.querySelector('.input-x');
        const inputY = fila.querySelector(`[data-producto="${producto}"]`);
        const x = parseFloat(inputX.value);
        const y = parseFloat(inputY.value);

        if (isNaN(x) || isNaN(y)) {
            datosInvalidos = true;
            return;
        }
        puntos.push({ x, y });
    });

    if (datosInvalidos) {
        mostrarEstado('⚠️ Se ignoraron filas con valores no numéricos. Revise los campos marcados en rojo.', 'warning');
    }

    // Eliminar duplicados en X (mantener último)
    const mapaUnicos = new Map();
    puntos.forEach(p => mapaUnicos.set(p.x, p));
    return Array.from(mapaUnicos.values()).sort((a, b) => a.x - b.x);
}

// ======================================================================
// 3. ALGORITMOS MATEMÁTICOS
// ======================================================================

/** Interpolación de Lagrange - O(n²) por evaluación */
function lagrange(puntos, xObj) {
    const n = puntos.length;
    if (n === 0) return NaN;
    if (n === 1) return puntos[0].y;

    for (let i = 0; i < n; i++) {
        if (Math.abs(xObj - puntos[i].x) < 1e-12) return puntos[i].y;
    }

    let resultado = 0;
    for (let i = 0; i < n; i++) {
        let termino = puntos[i].y;
        for (let j = 0; j < n; j++) {
            if (i !== j) {
                termino *= (xObj - puntos[j].x) / (puntos[i].x - puntos[j].x);
            }
        }
        resultado += termino;
    }
    return resultado;
}

/** Polinomio de Newton - Diferencias divididas precalculadas O(n) por evaluación */
function crearInterpoladorNewton(puntos) {
    const n = puntos.length;
    if (n === 0) return () => NaN;
    if (n === 1) return () => puntos[0].y;

    const x = puntos.map(p => p.x);
    const dd = puntos.map(p => p.y);

    for (let j = 1; j < n; j++) {
        for (let i = n - 1; i >= j; i--) {
            const denominador = x[i] - x[i - j];
            if (Math.abs(denominador) < 1e-15) {
                throw new Error(`Error numérico: puntos con X muy cercana (x=${x[i]}).`);
            }
            dd[i] = (dd[i] - dd[i - 1]) / denominador;
        }
    }

    return function (xObj) {
        let resultado = dd[n - 1];
        for (let i = n - 2; i >= 0; i--) {
            resultado = resultado * (xObj - x[i]) + dd[i];
        }
        return resultado;
    };
}

/** Spline Cúbico Natural con validación robusta */
function crearSplineNatural(puntos) {
    const n = puntos.length - 1;
    if (n < 1) return () => NaN;
    if (n === 1) {
        const p0 = puntos[0], p1 = puntos[1];
        const m = (p1.y - p0.y) / (p1.x - p0.x);
        return (x) => p0.y + m * (x - p0.x);
    }

    const x = puntos.map(p => p.x);
    const a = puntos.map(p => p.y);
    const h = new Array(n);
    for (let i = 0; i < n; i++) {
        h[i] = x[i + 1] - x[i];
        if (h[i] <= 1e-15) throw new Error(`Error: puntos con X no estrictamente creciente.`);
    }

    const alpha = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
        alpha[i] = (3 / h[i]) * (a[i + 1] - a[i]) - (3 / h[i - 1]) * (a[i] - a[i - 1]);
    }

    const c = new Array(n + 1).fill(0);
    const l = new Array(n + 1).fill(1);
    const mu = new Array(n + 1).fill(0);
    const z = new Array(n + 1).fill(0);

    for (let i = 1; i < n; i++) {
        l[i] = 2 * (x[i + 1] - x[i - 1]) - h[i - 1] * mu[i - 1];
        if (Math.abs(l[i]) < 1e-15) throw new Error(`Inestabilidad numérica en Spline.`);
        mu[i] = h[i] / l[i];
        z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
    }

    l[n] = 1; z[n] = 0; c[n] = 0;

    const b = new Array(n);
    const d = new Array(n);

    for (let j = n - 1; j >= 0; j--) {
        c[j] = z[j] - mu[j] * c[j + 1];
        b[j] = (a[j + 1] - a[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
        d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
    }

    return function (xObj) {
        let i;
        if (xObj <= x[0]) i = 0;
        else if (xObj >= x[n]) i = n - 1;
        else {
            let low = 0, high = n;
            while (low < high) {
                const mid = Math.floor((low + high) / 2);
                if (x[mid] < xObj) low = mid + 1;
                else high = mid;
            }
            i = low - 1;
        }
        const dx = xObj - x[i];
        return a[i] + b[i] * dx + c[i] * dx * dx + d[i] * dx * dx * dx;
    };
}

// ======================================================================
// 4. ORQUESTACIÓN DE CÁLCULOS Y RENDERIZADO COMPLETO
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
    progressBar.style.width = '30%';

    try {
        const productoSeleccionado = document.getElementById('productoSeleccionado').value;
        const xObj = parseFloat(document.getElementById('diaEstimacion').value);

        if (isNaN(xObj)) throw new Error("El día de estimación no es un número válido.");

        const puntos = obtenerDatosProducto(productoSeleccionado);
        if (puntos.length < 2) throw new Error("Se necesitan al menos 2 puntos válidos para interpolar.");

        // Cálculo de incrementos
        const incrementos = {};
        productos.forEach(prod => {
            const datosProd = obtenerDatosProducto(prod);
            if (datosProd.length >= 2) {
                const primero = datosProd[0].y;
                const ultimo = datosProd[datosProd.length - 1].y;
                incrementos[prod] = ((ultimo - primero) / primero) * 100;
            } else {
                incrementos[prod] = 0;
            }
        });
        const productoMayorIncremento = Object.keys(incrementos).reduce((a, b) =>
            incrementos[a] > incrementos[b] ? a : b
        );

        await new Promise(resolve => setTimeout(resolve, 30));
        progressBar.style.width = '60%';

        // EJECUTAR LOS 3 MÉTODOS
        const metodos = ['lagrange', 'newton', 'spline'];

        metodos.forEach(metodo => {
            try {
                let funcInterpolacion;
                if (metodo === 'lagrange') {
                    funcInterpolacion = (x) => lagrange(puntos, x);
                } else if (metodo === 'newton') {
                    funcInterpolacion = crearInterpoladorNewton(puntos);
                } else if (metodo === 'spline') {
                    funcInterpolacion = crearSplineNatural(puntos);
                }
                const valorEstimado = funcInterpolacion(xObj);
                generarContenidoCompleto(
                    metodo, puntos, xObj, valorEstimado, funcInterpolacion,
                    productoSeleccionado, incrementos, productoMayorIncremento
                );
            } catch (error) {
                console.error(`Error en ${metodo}:`, error);
                document.getElementById(`contenido-${metodo}`).innerHTML = `
                    <div class="alert alert-danger m-4">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <strong>Error al calcular:</strong> ${error.message}
                    </div>`;
            }
        });

        progressBar.style.width = '100%';
        mostrarEstado('✅ Cálculos completados exitosamente para los 3 métodos.', 'success');

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

/**
 * GENERA EL CONTENIDO COMPLETO PARA UN MÉTODO
 * con las 5 secciones requeridas: Resultados, Tablas, Gráficos, Explicación, Interpretación
 */
function generarContenidoCompleto(metodo, puntos, xObj, valorEstimado, funcInterpolacion,
    producto, incrementos, productoMayor) {
    const container = document.getElementById(`contenido-${metodo}`);
    const nombreMetodo = metodo === 'lagrange' ? 'Lagrange' : metodo === 'newton' ? 'Newton' : 'Splines Cúbicos';
    const colorMetodo = metodo === 'lagrange' ? 'primary' : metodo === 'newton' ? 'danger' : 'success';
    const dentroRango = xObj >= puntos[0].x && xObj <= puntos[puntos.length - 1].x;

    // Íconos para cada método
    const iconoMetodo = metodo === 'lagrange' ? 'fa-square-root-alt' :
        metodo === 'newton' ? 'fa-superscript' : 'fa-bezier-curve';

    let html = '';

    // ================================================================
    // SECCIÓN 4: RESULTADOS DEL MÉTODO
    // ================================================================
    html += `
    <div class="mb-4 fade-in">
        <div class="d-flex align-items-center mb-3">
            <span class="seccion-numero me-3">4</span>
            <h4 class="fw-bold text-dark mb-0">
                <i class="fas ${iconoMetodo} text-${colorMetodo} me-2"></i>
                Resultados — Método de ${nombreMetodo}
            </h4>
        </div>
        <div class="row g-3">
            <!-- Precio estimado -->
            <div class="col-md-4">
                <div class="card card-resultado shadow-sm h-100 border-top-${colorMetodo}" 
                     style="border-top: 4px solid var(--bs-${colorMetodo})">
                    <div class="card-body text-center">
                        <i class="fas fa-tag fs-1 text-${colorMetodo} mb-2 d-block"></i>
                        <h6 class="text-muted small mb-2">Precio Estimado para Día ${xObj}</h6>
                        <h2 class="fw-bold text-${colorMetodo} mb-1">
                            Bs ${valorEstimado.toFixed(4)}
                        </h2>
                        <small class="text-muted">por kg de ${nombresProductos[producto]} ${emojisProductos[producto]}</small>
                    </div>
                </div>
            </div>
            <!-- Mayor incremento -->
            <div class="col-md-4">
                <div class="card card-resultado shadow-sm h-100" 
                     style="border-top: 4px solid #ff9f1c">
                    <div class="card-body text-center">
                        <i class="fas fa-trophy fs-1 text-warning mb-2 d-block"></i>
                        <h6 class="text-muted small mb-2">Producto con Mayor Incremento</h6>
                        <h2 class="fw-bold text-warning mb-1">
                            ${emojisProductos[productoMayor]} +${incrementos[productoMayor].toFixed(1)}%
                        </h2>
                        <small class="text-muted">${nombresProductos[productoMayor]}</small>
                    </div>
                </div>
            </div>
            <!-- Confiabilidad -->
            <div class="col-md-4">
                <div class="card card-resultado shadow-sm h-100" 
                     style="border-top: 4px solid ${dentroRango ? '#198754' : '#dc3545'}">
                    <div class="card-body text-center">
                        <i class="fas fa-shield-alt fs-1 ${dentroRango ? 'text-success' : 'text-danger'} mb-2 d-block"></i>
                        <h6 class="text-muted small mb-2">Confiabilidad de la Estimación</h6>
                        <h2 class="fw-bold ${dentroRango ? 'text-success' : 'text-danger'} mb-1">
                            ${dentroRango ? 'ALTA' : 'BAJA'}
                        </h2>
                        <small class="text-muted">${dentroRango ? '✅ Interpolación (dentro del rango)' : '⚠️ Extrapolación (fuera del rango)'}</small>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Análisis de comportamiento y dispersión -->
        <div class="row g-3 mt-2">
            <div class="col-md-6">
                <div class="card bg-light border-0 shadow-sm h-100">
                    <div class="card-body">
                        <h6 class="fw-bold text-dark">
                            <i class="fas fa-chart-line text-${colorMetodo} me-2"></i>
                            Comportamiento de la Curva
                        </h6>
                        <p class="mb-0 text-muted">
                            La curva de precios muestra una <strong>tendencia alcista sostenida</strong> durante el mes, 
                            pasando de <strong>Bs ${puntos[0].y.toFixed(2)}</strong> (día ${puntos[0].x}) a 
                            <strong>Bs ${puntos[puntos.length - 1].y.toFixed(2)}</strong> (día ${puntos[puntos.length - 1].x}), 
                            con un incremento total del <strong class="text-danger">${incrementos[producto].toFixed(1)}%</strong>.
                        </p>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card bg-light border-0 shadow-sm h-100">
                    <div class="card-body">
                        <h6 class="fw-bold text-dark">
                            <i class="fas fa-exclamation-circle text-warning me-2"></i>
                            ¿Qué pasa si los datos son muy dispersos?
                        </h6>
                        <p class="mb-0 text-muted">
                            ${metodo === 'spline' ?
            'Los <strong>Splines Cúbicos</strong> manejan bien datos dispersos al dividir el intervalo en segmentos independientes, evitando oscilaciones bruscas (fenómeno de Runge).' :
            'Con datos muy dispersos, los polinomios globales (Lagrange/Newton) pueden presentar el <strong>fenómeno de Runge</strong>: oscilaciones extremas entre puntos, especialmente en los bordes.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    // ================================================================
    // SECCIÓN 5: TABLAS DE DATOS
    // ================================================================
    html += `
    <div class="mb-4 fade-in">
        <div class="d-flex align-items-center mb-3">
            <span class="seccion-numero me-3">5</span>
            <h4 class="fw-bold text-dark mb-0">
                <i class="fas fa-table text-${colorMetodo} me-2"></i>
                Tabla de Datos — Método de ${nombreMetodo}
            </h4>
        </div>
        <div class="card border-0 shadow-sm">
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead class="bg-light">
                            <tr>
                                <th class="py-3">Día (x)</th>
                                <th class="py-3">Precio Real (Bs)</th>
                                <th class="py-3">Precio Estimado (Bs)</th>
                                <th class="py-3">Error Absoluto</th>
                                <th class="py-3">Error Relativo (%)</th>
                            </tr>
                        </thead>
                        <tbody>`;

    // PUNTOS CONOCIDOS (error = 0 por definición)
    puntos.forEach(p => {
        const estimado = funcInterpolacion(p.x);
        const errorAbs = Math.abs(p.y - estimado);
        const errorRel = p.y !== 0 ? (errorAbs / Math.abs(p.y)) * 100 : 0;
        html += `
            <tr class="table-light">
                <td><span class="badge bg-secondary">${p.x}</span></td>
                <td class="fw-bold">${p.y.toFixed(4)}</td>
                <td class="text-${colorMetodo} fw-bold">${estimado.toFixed(4)}</td>
                <td><span class="badge bg-success">${errorAbs.toFixed(6)}</span></td>
                <td><span class="badge bg-success">${errorRel.toFixed(4)}%</span></td>
            </tr>`;
    });

    // PUNTOS INTERMEDIOS DE PRUEBA (donde SÍ hay error)
    html += `<tr class="table-warning"><td colspan="5" class="text-center py-2 fw-bold">
        <i class="fas fa-flask me-2"></i>Puntos de Prueba Intermedios (donde se observa el error real)</td></tr>`;

    for (let i = 0; i < puntos.length - 1; i++) {
        const xMid = (puntos[i].x + puntos[i + 1].x) / 2;
        const yMidEstimado = funcInterpolacion(xMid);
        // Valor real aproximado por interpolación lineal para comparación
        const yMidReal = puntos[i].y + (puntos[i + 1].y - puntos[i].y) *
            (xMid - puntos[i].x) / (puntos[i + 1].x - puntos[i].x);
        const errorAbs = Math.abs(yMidReal - yMidEstimado);
        const errorRel = yMidReal !== 0 ? (errorAbs / Math.abs(yMidReal)) * 100 : 0;
        html += `
            <tr>
                <td><span class="badge bg-info">${xMid.toFixed(1)}</span></td>
                <td class="text-muted">~${yMidReal.toFixed(4)}</td>
                <td class="text-${colorMetodo} fw-bold">${yMidEstimado.toFixed(4)}</td>
                <td><span class="badge bg-warning text-dark">${errorAbs.toFixed(6)}</span></td>
                <td><span class="badge bg-warning text-dark">${errorRel.toFixed(4)}%</span></td>
            </tr>`;
    }

    html += `</tbody></table></div></div></div></div>`;

    // ================================================================
    // SECCIÓN 6: GRÁFICO
    // ================================================================
    html += `
    <div class="mb-4 fade-in">
        <div class="d-flex align-items-center mb-3">
            <span class="seccion-numero me-3">6</span>
            <h4 class="fw-bold text-dark mb-0">
                <i class="fas fa-chart-area text-${colorMetodo} me-2"></i>
                Gráfico Interpretativo — Método de ${nombreMetodo}
            </h4>
        </div>
        <div class="card border-0 shadow-sm">
            <div class="card-body p-4">
                <div class="chart-container">
                    <canvas id="grafico-${metodo}"></canvas>
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
                Explicación del Algoritmo — Método de ${nombreMetodo}
            </h4>
        </div>
        <div class="card border-0 shadow-sm bg-light">
            <div class="card-body">`;

    if (metodo === 'lagrange') {
        html += `
                <h5 class="fw-bold text-primary">Polinomio Interpolador de Lagrange</h5>
                <p>El método de <strong>Lagrange</strong> construye un <strong>polinomio único de grado n−1</strong> 
                   que pasa exactamente por los n puntos de datos conocidos.</p>
                <div class="math-formula lagrange">
                    <p class="mb-1 fw-bold text-center">P(x) = Σ<sub>i=0</sub><sup>n-1</sup> y<sub>i</sub> · L<sub>i</sub>(x)</p>
                    <p class="mb-0 small text-center text-muted">
                        donde L<sub>i</sub>(x) = Π<sub>j≠i</sub> (x − x<sub>j</sub>) / (x<sub>i</sub> − x<sub>j</sub>)
                    </p>
                </div>
                <p><strong>Ventaja:</strong> Fácil de implementar y entender conceptualmente.</p>
                <p><strong>Desventaja:</strong> Agregar un nuevo punto requiere recalcular <em>todo</em> el polinomio. 
                   Susceptible al <strong>fenómeno de Runge</strong> con muchos puntos (oscilaciones en los bordes).</p>
                <p class="mb-0"><strong>Complejidad:</strong> O(n²) para cada evaluación.</p>`;
    } else if (metodo === 'newton') {
        html += `
                <h5 class="fw-bold text-danger">Polinomio Interpolador de Newton (Diferencias Divididas)</h5>
                <p>El método de <strong>Newton</strong> construye el mismo polinomio que Lagrange, pero usando 
                   <strong>diferencias divididas</strong>, lo que permite agregar nuevos puntos sin recalcular todo.</p>
                <div class="math-formula newton">
                    <p class="mb-1 fw-bold text-center">
                        P(x) = f[x₀] + f[x₀,x₁](x−x₀) + f[x₀,x₁,x₂](x−x₀)(x−x₁) + ...
                    </p>
                    <p class="mb-0 small text-center text-muted">
                        donde f[x₀,...,x<sub>k</sub>] son las diferencias divididas de orden k
                    </p>
                </div>
                <p><strong>Ventaja:</strong> Más eficiente para agregar nuevos puntos. Mismo resultado que Lagrange.</p>
                <p><strong>Desventaja:</strong> Igual susceptibilidad al fenómeno de Runge con datos dispersos.</p>
                <p class="mb-0"><strong>Complejidad:</strong> O(n²) para construir las diferencias divididas, O(n) por evaluación.</p>`;
    } else {
        html += `
                <h5 class="fw-bold text-success">Splines Cúbicos Naturales</h5>
                <p>Los <strong>Splines Cúbicos</strong> dividen el intervalo en segmentos y ajustan un 
                   <strong>polinomio cúbico diferente en cada subintervalo</strong>, garantizando continuidad C² en los nodos.</p>
                <div class="math-formula spline">
                    <p class="mb-1 fw-bold text-center">
                        S<sub>i</sub>(x) = a<sub>i</sub> + b<sub>i</sub>(x−x<sub>i</sub>) + c<sub>i</sub>(x−x<sub>i</sub>)² + d<sub>i</sub>(x−x<sub>i</sub>)³
                    </p>
                    <p class="mb-0 small text-center text-muted">
                        Condiciones: S<sub>i</sub>(x<sub>i+1</sub>) = S<sub>i+1</sub>(x<sub>i+1</sub>), 
                        S'<sub>i</sub>(x<sub>i+1</sub>) = S'<sub>i+1</sub>(x<sub>i+1</sub>), 
                        S''<sub>i</sub>(x<sub>i+1</sub>) = S''<sub>i+1</sub>(x<sub>i+1</sub>)
                    </p>
                </div>
                <p><strong>Ventaja:</strong> Curvas suaves sin oscilaciones bruscas. <strong>Ideal para datos volátiles</strong> como precios de mercado.</p>
                <p><strong>Desventaja:</strong> Más complejo de implementar. No produce un polinomio global.</p>
                <p class="mb-0"><strong>Complejidad:</strong> O(n) para construir (sistema tridiagonal), O(log n) por evaluación (búsqueda binaria).</p>`;
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
                Interpretación de Resultados — Método de ${nombreMetodo}
            </h4>
        </div>
        <div class="card border-0 shadow-sm">
            <div class="card-body">
                <ul class="list-group list-group-flush">`;

    // Item 1: Precio estimado
    html += `
        <li class="list-group-item">
            <i class="fas fa-tag text-${colorMetodo} me-2"></i>
            <strong>¿Cuál sería el precio aproximado en un día sin dato?</strong><br>
            <span class="text-muted">
                El precio estimado para el <strong>día ${xObj}</strong> es de 
                <strong class="text-${colorMetodo}">Bs ${valorEstimado.toFixed(4)}/kg</strong> 
                de ${nombresProductos[producto]}, 
                ${dentroRango ? 'dentro del rango de datos conocidos (interpolación).' :
            'aunque está <strong>fuera del rango</strong> conocido (extrapolación), por lo que debe tomarse con precaución.'}
            </span>
        </li>`;

    // Item 2: Comportamiento de la curva
    html += `
        <li class="list-group-item">
            <i class="fas fa-chart-line text-${colorMetodo} me-2"></i>
            <strong>¿Cómo se comporta la curva de precios durante el mes?</strong><br>
            <span class="text-muted">
                La curva muestra una <strong>tendencia alcista</strong> desde Bs ${puntos[0].y.toFixed(2)} (día ${puntos[0].x}) 
                hasta Bs ${puntos[puntos.length - 1].y.toFixed(2)} (día ${puntos[puntos.length - 1].x}), 
                con un incremento de <strong>${incrementos[producto].toFixed(1)}%</strong>, 
                reflejando el impacto de la crisis de abastecimiento.
            </span>
        </li>`;

    // Item 3: Producto con mayor incremento
    html += `
        <li class="list-group-item">
            <i class="fas fa-trophy text-warning me-2"></i>
            <strong>¿Qué producto tuvo mayor incremento?</strong><br>
            <span class="text-muted">
                <strong>${nombresProductos[productoMayor]} ${emojisProductos[productoMayor]}</strong> 
                con un incremento del <strong class="text-warning">+${incrementos[productoMayor].toFixed(1)}%</strong>.
                ${productoMayor === producto ? 'Este es precisamente el producto que está analizando.' : ''}
            </span>
        </li>`;

    // Item 4: Confiabilidad
    html += `
        <li class="list-group-item">
            <i class="fas fa-shield-alt ${dentroRango ? 'text-success' : 'text-danger'} me-2"></i>
            <strong>¿Qué tan confiable es la interpolación?</strong><br>
            <span class="text-muted">
                ${dentroRango ?
            `<strong class="text-success">ALTA:</strong> El día ${xObj} está dentro del rango [${puntos[0].x}, ${puntos[puntos.length - 1].x}]. 
                 La estimación es matemáticamente confiable.` :
            `<strong class="text-danger">BAJA:</strong> El día ${xObj} está FUERA del rango. 
                 Los resultados son menos confiables (extrapolación).`}
            </span>
        </li>`;

    // Item 5: Datos dispersos
    html += `
        <li class="list-group-item">
            <i class="fas fa-exclamation-triangle text-warning me-2"></i>
            <strong>¿Qué pasa si los datos son muy dispersos?</strong><br>
            <span class="text-muted">
                ${metodo === 'spline' ?
            'Los <strong>Splines Cúbicos</strong> son el método <strong>más estable</strong> para datos dispersos o volátiles, ya que dividen el problema en segmentos locales, evitando el fenómeno de Runge.' :
            `Con <strong>${nombreMetodo}</strong>, los polinomios globales pueden generar 
                 <strong>oscilaciones extremas</strong> entre puntos distantes (fenómeno de Runge). 
                 Para datos volátiles como precios de mercado, considere usar <strong>Splines Cúbicos</strong>.`}
            </span>
        </li >
        `;

    html += `</ul></div></div></div>`;

    container.innerHTML = html;

    // Dibujar gráfico DESPUÉS de que el DOM esté actualizado
    setTimeout(() => crearGrafico(metodo, puntos, funcInterpolacion, xObj, valorEstimado, producto), 50);
}

// ======================================================================
// 5. CREACIÓN DE GRÁFICOS CON LÍNEAS GUÍA Y PUNTO DESTACADO
// ======================================================================
function crearGrafico(metodo, puntos, funcInterpolacion, xObj, valorEstimado, producto) {
    const canvas = document.getElementById(`grafico-${metodo}`);
    if (!canvas) return;

    if (graficos[metodo]) graficos[metodo].destroy();

    const ctx = canvas.getContext('2d');
    const minX = Math.min(...puntos.map(p => p.x));
    const maxX = Math.max(...puntos.map(p => p.x));
    const start = Math.floor(Math.max(0, minX - 3));
    const end = Math.ceil(maxX + 7);
    const step = (end - start) / 200;

    const datosCurva = [];
    for (let x = start; x <= end; x += step) {
        datosCurva.push({ x: parseFloat(x.toFixed(2)), y: funcInterpolacion(x) });
    }

    const colorLinea = metodo === 'lagrange' ? '#0d6efd' : metodo === 'newton' ? '#dc3545' : '#198754';
    const colorLineaGuia = metodo === 'lagrange' ? 'rgba(13,110,253,0.5)' :
        metodo === 'newton' ? 'rgba(220,53,69,0.5)' : 'rgba(25,135,84,0.5)';

    graficos[metodo] = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Datos Reales',
                    data: puntos,
                    backgroundColor: coloresProductos[producto],
                    borderColor: coloresProductos[producto],
                    pointRadius: 7,
                    pointHoverRadius: 10,
                    pointBorderWidth: 2,
                    pointBorderColor: '#fff',
                    showLine: false,
                    order: 2
                },
                {
                    label: `Curva ${metodo.charAt(0).toUpperCase() + metodo.slice(1)}`,
                    type: 'line',
                    data: datosCurva,
                    borderColor: colorLinea,
                    borderWidth: 3,
                    pointRadius: 0,
                    fill: false,
                    tension: 0,
                    order: 1
                },
                {
                    label: `Punto Estimado (Día ${xObj})`,
                    data: [{ x: xObj, y: valorEstimado }],
                    backgroundColor: '#FF6B35',
                    borderColor: '#FF4500',
                    pointRadius: 14,
                    pointStyle: 'star',
                    pointBorderWidth: 3,
                    pointBorderColor: '#fff',
                    showLine: false,
                    order: 0
                },
                // Líneas guía desde el punto estimado a los ejes
                {
                    label: 'Guía Vertical',
                    data: [
                        { x: xObj, y: Math.min(...puntos.map(p => p.y)) * 0.8 },
                        { x: xObj, y: valorEstimado }
                    ],
                    borderColor: colorLineaGuia,
                    borderWidth: 2,
                    borderDash: [8, 6],
                    pointRadius: 0,
                    fill: false,
                    showLine: true,
                    order: 3
                },
                {
                    label: 'Guía Horizontal',
                    data: [
                        { x: start, y: valorEstimado },
                        { x: xObj, y: valorEstimado }
                    ],
                    borderColor: colorLineaGuia,
                    borderWidth: 2,
                    borderDash: [8, 6],
                    pointRadius: 0,
                    fill: false,
                    showLine: true,
                    order: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'nearest',
                intersect: false
            },
            plugins: {
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function (context) {
                            if (context.dataset.label.includes('Guía')) return '';
                            return `${context.dataset.label}: (${context.parsed.x}, Bs ${context.parsed.y.toFixed(4)})`;
                        }
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: { size: 13 },
                        filter: function (item) {
                            return !item.text.includes('Guía');
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Día del Mes',
                        font: { weight: 'bold', size: 14 }
                    },
                    grid: { color: '#f0f0f0' }
                },
                y: {
                    title: {
                        display: true,
                        text: `Precio ${nombresProductos[producto]} (Bs/kg)`,
                        font: { weight: 'bold', size: 14 }
                    },
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

// ======================================================================
// 7. CONFIGURACIÓN DE EVENTOS Y ARRANQUE
// ======================================================================
document.addEventListener('DOMContentLoaded', () => {
    inicializarTabla();

    document.getElementById('btnAgregarFila').addEventListener('click', agregarFila);
    document.getElementById('btnEjecutar').addEventListener('click', () => dispararCalculo());
    document.getElementById('btnRestaurar').addEventListener('click', restaurarDatosPorDefecto);

    // Sincronización centralizada
    document.querySelectorAll('#diaEstimacion, #productoSeleccionado').forEach(el =>
        el.addEventListener('input', dispararCalculo)
    );

    // Sincronizar cambios en la tabla
    document.getElementById('tablaDatos').addEventListener('input', (e) => {
        if (e.target.classList.contains('input-x') || e.target.classList.contains('input-y')) {
            dispararCalculo();
        }
    });

    // Al cambiar de pestaña, redibujar gráfico si existe
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