// Variables globales
let chartInstance = null;

// Datos base de demanda por producto (El Alto, Centro, Zona Sur)
const demandasBase = {
    pollo: [450, 300, 250],
    harina: [800, 500, 400],
    aceite: [300, 200, 150],
    papa: [1200, 700, 600]
};

// Cargar demanda base según producto seleccionado
function cargarDemandaBase() {
    const prod = document.getElementById('producto').value;
    document.getElementById('b1').value = demandasBase[prod][0];
    document.getElementById('b2').value = demandasBase[prod][1];
    document.getElementById('b3').value = demandasBase[prod][2];
}

// Aplicar estado de red (preajustes de matriz)
function aplicarEstadoRed() {
    const estado = document.getElementById('estadoRed').value;
    if (estado === 'robusta') {
        ['a11','a22','a33'].forEach(id => document.getElementById(id).value = 200);
        ['a12','a13','a21','a23','a31','a32'].forEach(id => document.getElementById(id).value = 10);
    } else if (estado === 'fragil') {
        ['a11','a12','a13','a21','a31','a32'].forEach(id => document.getElementById(id).value = 100);
        document.getElementById('a22').value = 101;
        document.getElementById('a23').value = 100;
        document.getElementById('a33').value = 101;
    } else if (estado === 'colapso') {
        ['a11','a12','a13','a21','a22','a23','a31','a32','a33'].forEach(id => document.getElementById(id).value = 100);
        document.getElementById('a22').value = 100.01;
        document.getElementById('a33').value = 100.01;
    }
}

// Inicialización al cargar la página
window.onload = function() {
    cargarDemandaBase();
    aplicarEstadoRed();
};

// Método de Gauss-Seidel para resolver sistemas lineales
function gaussSeidel(A, b, tol = 1e-6, maxIter = 100) {
    let n = A.length;
    let x = [0, 0, 0];
    let iteraciones = [];
    let convergio = false;

    for (let iter = 0; iter < maxIter; iter++) {
        let x_old = [...x];
        let error = 0;
        
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
                if (i !== j) sum += A[i][j] * x[j];
            }
            x[i] = (b[i] - sum) / A[i][i];
        }
        
        for (let i = 0; i < n; i++) {
            error = Math.max(error, Math.abs(x[i] - x_old[i]));
        }
        
        iteraciones.push({ 
            iter: iter + 1, 
            x1: x[0].toFixed(2), 
            x2: x[1].toFixed(2), 
            x3: x[2].toFixed(2), 
            error: error.toExponential(2) 
        });
        
        if (error < tol) { 
            convergio = true; 
            break; 
        }
    }
    
    return { x: x, iteraciones: iteraciones, convergio: convergio };
}

// Norma infinito de un vector
function normaInfVector(v) {
    return Math.max(Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2]));
}

// Función principal de simulación
function ejecutarSimulacion() {
    try {
        // Obtener matriz A
        const A = [
            [parseFloat(document.getElementById('a11').value), parseFloat(document.getElementById('a12').value), parseFloat(document.getElementById('a13').value)],
            [parseFloat(document.getElementById('a21').value), parseFloat(document.getElementById('a22').value), parseFloat(document.getElementById('a23').value)],
            [parseFloat(document.getElementById('a31').value), parseFloat(document.getElementById('a32').value), parseFloat(document.getElementById('a33').value)]
        ];
        
        // Obtener vector b
        const b = [
            parseFloat(document.getElementById('b1').value), 
            parseFloat(document.getElementById('b2').value), 
            parseFloat(document.getElementById('b3').value)
        ];
        
        // Validación de diagonal
        if (A[0][0] === 0 || A[1][1] === 0 || A[2][2] === 0) {
            alert("Error: La capacidad propia de las zonas (diagonal) no puede ser cero.");
            return;
        }

        const rumorPct = parseFloat(document.getElementById('nivelRumor').value);
        const regiones = ["El Alto", "Centro", "Zona Sur"];

        // Resolver sistema base
        const resBase = gaussSeidel(A, b);
        const x = resBase.x;
        
        // Perturbar b (rumor)
        const bPerturbado = b.map(val => val * (1 + rumorPct));
        
        // Resolver sistema perturbado
        const resPerturbado = gaussSeidel(A, bPerturbado);
        const xPerturbado = resPerturbado.x;

        // Cálculo de sensibilidad (Número de Condición)
        const deltaX = xPerturbado.map((val, i) => val - x[i]);
        const normaX = normaInfVector(x);
        const normaDeltaX = normaInfVector(deltaX);
        const normaB = normaInfVector(b);
        const normaDeltaB = normaInfVector(bPerturbado.map((val, i) => val - b[i]));
        const condicion = (normaDeltaX / normaX) / (normaDeltaB / normaB);

        // 1. Semáforo de Crisis
        const semaforo = document.getElementById('semaforoCrisis');
        const textoSemaforo = document.getElementById('textoSemaforo');
        const subtextoSemaforo = document.getElementById('subtextoSemaforo');
        
        if (!resBase.convergio || condicion > 100) {
            semaforo.className = "alert text-center mb-4 alert-danger";
            textoSemaforo.innerText = "🚨 COLAPSO LOGÍSTICO DETECTADO";
            subtextoSemaforo.innerText = "El sistema es extremadamente inestable. Un pequeño rumor hace que la logística requerida se dispare a niveles imposibles de cumplir.";
        } else if (condicion > 20) {
            semaforo.className = "alert text-center mb-4 alert-warning";
            textoSemaforo.innerText = "⚠️ SISTEMA FRÁGIL Y VULNERABLE";
            subtextoSemaforo.innerText = "La red de distribución sufre. El rumor amplifica la presión sobre los camiones y almacenes de manera desproporcionada.";
        } else {
            semaforo.className = "alert text-center mb-4 alert-success";
            textoSemaforo.innerText = "✅ SISTEMA ESTABLE";
            subtextoSemaforo.innerText = "La red de distribución es robusta. Puede absorber el aumento de demanda por el rumor sin colapsar.";
        }

        // 2. Tabla de Resultados
        const tbody = document.getElementById('tablaResultados');
        tbody.innerHTML = '';
        let maxVarPct = -1;
        let zonaMasVulnerable = "";
        let variaciones = [];

        for (let i = 0; i < 3; i++) {
            const varPct = ((xPerturbado[i] - x[i]) / x[i]) * 100;
            variaciones.push(varPct);
            if (varPct > maxVarPct) { 
                maxVarPct = varPct; 
                zonaMasVulnerable = regiones[i]; 
            }
            tbody.innerHTML += `<tr>
                <td>${regiones[i]}</td>
                <td>${x[i].toFixed(1)} ton</td>
                <td class="fw-bold">${xPerturbado[i].toFixed(1)} ton</td>
                <td class="${varPct > 20 ? 'text-danger fw-bold' : 'text-success'}">+${varPct.toFixed(1)}%</td>
            </tr>`;
        }

        // 3. Generar respuestas a las 5 preguntas obligatorias
        const rumorTexto = (rumorPct * 100).toFixed(0);
        const condicionTexto = condicion > 1000 ? "extremadamente alto (>1000)" : condicion.toFixed(1);
        
        let respuestasHTML = '';
        
        // Pregunta 1: ¿Qué pasa si la demanda aumenta solo un 5%?
        respuestasHTML += `
            <div class="pregunta-item">
                <div class="pregunta-texto">
                    <span class="pregunta-numero">1</span>
                    ¿Qué pasa si la demanda aumenta solo un ${rumorTexto}%?
                </div>
                <div class="respuesta-texto">
                    Aunque la demanda real solo aumenta un <strong>${rumorTexto}%</strong> por el rumor, el impacto en la logística de distribución es <span class="${maxVarPct > 50 ? 'highlight-danger' : 'highlight-warning'}">desproporcionado</span>. 
                    La zona más afectada (${zonaMasVulnerable}) requiere un <strong class="highlight-danger">${maxVarPct.toFixed(1)}%</strong> más de esfuerzo logístico. 
                    Esto significa que para satisfacer ese pequeño aumento de demanda, el sistema necesita movilizar ${maxVarPct > 100 ? 'el doble o más' : 'significativamente más'} camiones, rutas y almacenes, algo que físicamente no está disponible.
                </div>
            </div>
        `;

        // Pregunta 2: ¿La solución cambia poco o demasiado?
        const cambioRelativo = condicion > 50 ? 'demasiado' : 'poco';
        respuestasHTML += `
            <div class="pregunta-item">
                <div class="pregunta-texto">
                    <span class="pregunta-numero">2</span>
                    ¿La solución cambia poco o demasiado?
                </div>
                <div class="respuesta-texto">
                    La solución cambia <span class="${cambioRelativo === 'demasiado' ? 'highlight-danger' : 'highlight-success'}"><strong>${cambioRelativo.toUpperCase()}</strong></span>. 
                    Matemáticamente, el <strong>Número de Condición</strong> del sistema es <strong>${condicionTexto}</strong>. 
                    Esto significa que un pequeño cambio del ${rumorTexto}% en la demanda se amplifica hasta <strong>${condicionTexto} veces</strong> en la solución logística. 
                    ${condicion > 50 ? 'Es una amplificación extrema que hace imposible responder al rumor sin colapsar.' : 'Es una amplificación moderada que el sistema puede absorber.'}
                </div>
            </div>
        `;

        // Pregunta 3: ¿El sistema es estable o mal condicionado?
        const estadoSistema = (!resBase.convergio || condicion > 100) ? 'MAL CONDICIONADO' : (condicion > 20 ? 'FRÁGIL' : 'ESTABLE');
        const colorEstado = (!resBase.convergio || condicion > 100) ? 'highlight-danger' : (condicion > 20 ? 'highlight-warning' : 'highlight-success');
        respuestasHTML += `
            <div class="pregunta-item">
                <div class="pregunta-texto">
                    <span class="pregunta-numero">3</span>
                    ¿El sistema es estable o mal condicionado?
                </div>
                <div class="respuesta-texto">
                    El sistema es <span class="${colorEstado}"><strong>${estadoSistema}</strong></span>. 
                    ${!resBase.convergio ? 
                        'El método numérico de Gauss-Seidel <strong>no pudo converger</strong> ni siquiera después de 100 iteraciones. Esto es la prueba matemática definitiva de que la matriz de distribución es singular o extremadamente mal condicionada, reflejando un colapso total de la red logística.' :
                        condicion > 100 ?
                        'El Número de Condición es extremadamente alto, lo que indica que las filas de la matriz son casi linealmente dependientes. En términos logísticos, esto significa que todas las zonas dependen de las mismas rutas críticas, haciendo que cualquier bloqueo afecte a toda la ciudad.' :
                        condicion > 20 ?
                        'El sistema muestra sensibilidad moderada. Aunque converge, cualquier perturbación adicional podría empujarlo al colapso.' :
                        'El sistema es robusto. La matriz tiene una diagonal dominante, lo que significa que cada zona tiene capacidad propia e independiente para recibir el producto sin depender excesivamente de las demás.'
                    }
                </div>
            </div>
        `;

        // Pregunta 4: ¿Cómo afecta el rumor al abastecimiento?
        respuestasHTML += `
            <div class="pregunta-item">
                <div class="pregunta-texto">
                    <span class="pregunta-numero">4</span>
                    ¿Cómo afecta el rumor al abastecimiento?
                </div>
                <div class="respuesta-texto">
                    El rumor actúa como un <strong>multiplicador de caos</strong>. Aunque el consumo real de la población no cambia drásticamente, el sistema de distribución intenta responder a una demanda "fantasma" generada por las compras de pánico. 
                    ${maxVarPct > 100 ? 
                        `Como la logística requerida aumenta un <strong class="highlight-danger">${maxVarPct.toFixed(1)}%</strong> (más del doble), es físicamente imposible conseguir tantos camiones y rutas adicionales. El resultado es que el sistema falla y se generan <strong>estantes vacíos</strong>, no porque no haya producto en los almacenes centrales, sino porque la distribución colapsó matemáticamente.` :
                        `El aumento del <strong>${maxVarPct.toFixed(1)}%</strong> en la logística requerida genera presión adicional sobre el sistema. Si la red ya está operando cerca de su capacidad máxima, este esfuerzo extra puede ser la gota que derrama el vaso, causando retrasos y desabastecimiento intermitente.`
                    }
                </div>
            </div>
        `;

        // Pregunta 5: ¿Qué zona o mercado se vuelve más vulnerable?
        respuestasHTML += `
            <div class="pregunta-item">
                <div class="pregunta-texto">
                    <span class="pregunta-numero">5</span>
                    ¿Qué zona o mercado se vuelve más vulnerable?
                </div>
                <div class="respuesta-texto">
                    La zona matemáticamente más vulnerable es <strong class="highlight-danger">${zonaMasVulnerable}</strong>, que sufre un incremento de requerimiento logístico del <strong class="highlight-danger">${maxVarPct.toFixed(1)}%</strong>. 
                    <br><br>
                    <strong>Desglose por zona:</strong><br>
                    • <strong>El Alto:</strong> ${variaciones[0] > 0 ? '+' : ''}${variaciones[0].toFixed(1)}% de impacto<br>
                    • <strong>Centro:</strong> ${variaciones[1] > 0 ? '+' : ''}${variaciones[1].toFixed(1)}% de impacto<br>
                    • <strong>Zona Sur:</strong> ${variaciones[2] > 0 ? '+' : ''}${variaciones[2].toFixed(1)}% de impacto<br>
                    <br>
                    Esta vulnerabilidad no es aleatoria: depende de cómo están interconectadas las rutas en la matriz de distribución. ${zonaMasVulnerable} es más vulnerable porque sus rutas de acceso están más acopladas a las demás zonas, creando un efecto dominó cuando el sistema se perturba.
                </div>
            </div>
        `;

        document.getElementById('respuestasPreguntas').innerHTML = respuestasHTML;
        document.getElementById('apartadoPreguntas').style.display = 'block';

        // 4. Respuestas en lenguaje sencillo (resumen)
        document.getElementById('listaRespuestas').innerHTML = `
            <li class="mb-2">📌 <strong>El efecto multiplicador:</strong> Aunque la gente solo compró un <strong>${rumorTexto}%</strong> más por el rumor, la zona más afectada (<strong>${zonaMasVulnerable}</strong>) exigió un <strong>${maxVarPct.toFixed(1)}%</strong> más de esfuerzo logístico. ¡La solución cambia demasiado!</li>
            <li class="mb-2">📌 <strong>¿Por qué pasa esto?</strong> Porque las rutas están interconectadas (la matriz es "mal condicionada"). Un camión atascado en una zona retrasa a todas las demás, creando un efecto dominó.</li>
            <li class="mb-2">📌 <strong>Consecuencia real:</strong> Como es imposible conseguir ese ${maxVarPct.toFixed(1)}% extra de camiones y rutas, el sistema falla. Esto es lo que ves en la realidad como "estantes vacíos", no porque no haya producto, sino porque la distribución colapsó matemáticamente.</li>
        `;

        // 5. Tabla de Iteraciones (Académico)
        const tbodyIter = document.getElementById('tablaIteraciones');
        tbodyIter.innerHTML = '';
        resBase.iteraciones.slice(0, 30).forEach(row => {
            tbodyIter.innerHTML += `<tr><td>${row.iter}</td><td>${row.x1}</td><td>${row.x2}</td><td>${row.x3}</td><td>${row.error}</td></tr>`;
        });
        
        const msgConv = document.getElementById('mensajeConvergencia');
        msgConv.innerHTML = resBase.convergio 
            ? `<span class="text-success">✅ El método Gauss-Seidel encontró el equilibrio en ${resBase.iteraciones.length} pasos.</span>`
            : `<span class="text-danger">⚠️ El método NO pudo encontrar un equilibrio tras 100 intentos. Esto confirma matemáticamente el colapso del sistema.</span>`;

        // GENERAR CONCLUSIONES DINÁMICAS (AQUÍ ES DONDE SE DEBE LLAMAR)
        generarConclusiones(condicion, maxVarPct, zonaMasVulnerable, rumorPct, resBase, variaciones, x, xPerturbado, regiones);

        document.getElementById('resultadosCard').style.display = 'block';
        graficarResultados(regiones, x, xPerturbado);
        
        // Scroll suave hacia los resultados
        document.getElementById('resultadosCard').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        alert("El sistema colapsó matemáticamente (división por cero o valores extremos). Esto sucede en escenarios de bloqueo total. Intenta con un estado de red 'Frágil' o 'Normal'.");
        console.error(error);
    }
}

// Función para graficar resultados con Chart.js
function graficarResultados(labels, xBase, xPerturbado) {
    const ctx = document.getElementById('miGrafico').getContext('2d');
    
    if (chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { 
                    label: 'Logística Normal', 
                    data: xBase, 
                    backgroundColor: 'rgba(54, 162, 235, 0.7)', 
                    borderRadius: 5 
                },
                { 
                    label: 'Logística bajo Pánico', 
                    data: xPerturbado, 
                    backgroundColor: 'rgba(220, 53, 69, 0.8)', 
                    borderRadius: 5 
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { 
                legend: { position: 'bottom' } 
            },
            scales: { 
                y: { 
                    beginAtZero: true, 
                    title: { 
                        display: true, 
                        text: 'Toneladas a distribuir' 
                    } 
                } 
            }
        }
    });
}

// ============================================
// FUNCIÓN: Generar Conclusiones Dinámicas
// ============================================
// ============================================
// FUNCIÓN: Generar Conclusión General Única (Texto Negro)
// ============================================
function generarConclusiones(condicion, maxVarPct, zonaMasVulnerable, rumorPct, resBase, variaciones, x, xPerturbado, regiones) {
    const rumorTexto = (rumorPct * 100).toFixed(0);
    const estadoGeneral = condicion > 100 ? 'CRÍTICO' : (condicion > 20 ? 'VULNERABLE' : 'ESTABLE');
    const colorEstado = condicion > 100 ? 'danger' : (condicion > 20 ? 'warning' : 'success');
    
    let html = `
        <div class="alert bg-white border-start border-4 border-${colorEstado} text-dark mb-4 shadow-sm">
            <h4 class="fw-bold mb-3 text-${colorEstado}">
                <i class="fas fa-flag-checkered me-2"></i>Conclusión General del Escenario F
            </h4>
            <p class="mb-0" style="font-size: 1.05rem; line-height: 1.7; color: #000000; text-align: justify; text-justify: inter-word;">
                El análisis numérico del sistema de distribución de alimentos en La Paz revela un estado <strong>${estadoGeneral}</strong> 
                ${condicion > 100 ? 'con un número de condición extremadamente alto (' + (condicion > 1000 ? '> 1000' : condicion.toFixed(2)) + '), lo que demuestra que la red es altamente vulnerable a rumores y perturbaciones menores.' :
                  condicion > 20 ? 'con una condición moderada (número de condición: ' + condicion.toFixed(2) + '), que requiere atención para evitar que se degrade ante crisis mayores.' :
                  'robusto (número de condición: ' + condicion.toFixed(2) + ') que puede absorber perturbaciones sin colapsar.'}
                La simulación demuestra que un simple aumento del <strong>${rumorTexto}%</strong> en la demanda, generado por un rumor, puede provocar un impacto máximo del <strong>${maxVarPct.toFixed(1)}%</strong> en la zona más vulnerable (${zonaMasVulnerable}), confirmando que ${condicion > 50 ? 'el sistema amplifica exponencialmente las perturbaciones' : 'el sistema absorbe razonablemente las perturbaciones'}. 
                El <strong>Método de Gauss-Seidel</strong> ${resBase.convergio ? 
                    'convergió exitosamente en ' + resBase.iteraciones.length + ' iteraciones, demostrando que el sistema tiene una solución matemática válida y que la red logística mantiene un equilibrio inestable.' :
                    'NO convergió incluso después de 100 iteraciones, lo que constituye una evidencia matemática contundente de que la matriz es singular o extremadamente mal condicionada, significando que la red logística ha colapsado completamente y no existe una distribución estable posible.'
                }
                Este modelo explica por qué en La Paz hemos visto estantes vacíos incluso cuando hay productos disponibles en los almacenes centrales: no es necesario que haya escasez real para que se genere desabastecimiento, ya que un simple rumor puede provocar un colapso logístico si la red de distribución es frágil. 
                El problema fundamental es la interdependencia excesiva entre zonas, donde El Alto, Centro y Zona Sur dependen de las mismas avenidas y rutas, haciendo que un bloqueo en un punto crítico afecte simultáneamente a toda la ciudad. 
                La zona más vulnerable (${zonaMasVulnerable}) experimentó un aumento del <strong>${maxVarPct.toFixed(1)}%</strong> en la logística requerida, lo que en términos prácticos significa que necesitaría ${maxVarPct > 100 ? 'más del doble' : 'significativamente más'} de camiones, rutas y almacenes para satisfacer la demanda generada por el pánico, algo físicamente imposible en el corto plazo. 
                Para mejorar la resiliencia del sistema, se recomienda descentralizar la logística desarrollando capacidad propia de almacenamiento en cada zona, crear rutas de distribución alternativas que no pasen por los mismos puntos críticos, implementar estrategias de comunicación transparente para evitar que pequeños rumores se conviertan en pánico generalizado, y establecer sistemas de monitoreo en tiempo real que detecten aumentos inusuales en la demanda. 
                Este ejercicio demuestra que los métodos numéricos no son solo herramientas abstractas de cálculo, sino que pueden aplicarse para comprender y resolver problemas sociales complejos como el desabastecimiento de alimentos, proporcionando insights cuantitativos que pueden guiar la toma de decisiones estratégicas para mejorar la resiliencia del sistema de distribución.
            </p>
        </div>
    `;
    
    // Insertar en el DOM
    document.getElementById('contenidoConclusiones').innerHTML = html;
    document.getElementById('conclusionesCard').style.display = 'block';
}