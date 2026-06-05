// Variables globales para gráficos
let chartRK4 = null;
let chartComparacion = null;

// Cargar escenarios predefinidos
function cargarEscenario() {
    const escenario = document.getElementById('escenarioPreset').value;
    
    if (escenario === 'estable') {
        // Diálogo efectivo, conflicto se estabiliza
        document.getElementById('N0').value = 900;
        document.getElementById('M0').value = 50;
        document.getElementById('D0').value = 50;
        document.getElementById('param_a').value = 0.001;
        document.getElementById('param_b').value = 0.3;
        document.getElementById('param_c').value = 0.01;
        document.getElementById('param_k').value = 0.3;
        document.getElementById('param_r').value = 0.05;
    } else if (escenario === 'escalada') {
        // Escalada moderada
        document.getElementById('N0').value = 850;
        document.getElementById('M0').value = 100;
        document.getElementById('D0').value = 50;
        document.getElementById('param_a').value = 0.002;
        document.getElementById('param_b').value = 0.1;
        document.getElementById('param_c').value = 0.005;
        document.getElementById('param_k').value = 0.2;
        document.getElementById('param_r').value = 0.05;
    } else if (escenario === 'masificacion') {
        // Masificación del conflicto
        document.getElementById('N0').value = 800;
        document.getElementById('M0').value = 150;
        document.getElementById('D0').value = 50;
        document.getElementById('param_a').value = 0.003;
        document.getElementById('param_b').value = 0.05;
        document.getElementById('param_c').value = 0.002;
        document.getElementById('param_k').value = 0.1;
        document.getElementById('param_r').value = 0.08;
    } else if (escenario === 'sin_mediadores') {
        // Sin mediadores, caos
        document.getElementById('N0').value = 850;
        document.getElementById('M0').value = 150;
        document.getElementById('D0').value = 0;
        document.getElementById('param_a').value = 0.003;
        document.getElementById('param_b').value = 0.0;
        document.getElementById('param_c').value = 0.0;
        document.getElementById('param_k').value = 0.0;
        document.getElementById('param_r').value = 0.0;
    }
}

// Sistema de EDOs: retorna [dN/dt, dM/dt, dD/dt]
function sistemaEDO(t, N, M, D, params) {
    const { a, b, c, k, r } = params;
    
    const dN = -a * N * M + b * D;
    const dM = a * N * M - c * M * D;
    const dD = k * M - r * D;
    
    return [dN, dM, dD];
}

// Método de Heun (Predictor-Corrector)
function metodoHeun(N0, M0, D0, params, dt, tiempoMax) {
    let t = 0;
    let N = N0, M = M0, D = D0;
    let resultados = [{ t: 0, N: N, M: M, D: D }];
    
    while (t < tiempoMax) {
        // Predictor (Euler)
        let [dN1, dM1, dD1] = sistemaEDO(t, N, M, D, params);
        let N_pred = N + dt * dN1;
        let M_pred = M + dt * dM1;
        let D_pred = D + dt * dD1;
        
        // Corrector
        let [dN2, dM2, dD2] = sistemaEDO(t + dt, N_pred, M_pred, D_pred, params);
        N = N + (dt / 2) * (dN1 + dN2);
        M = M + (dt / 2) * (dM1 + dM2);
        D = D + (dt / 2) * (dD1 + dD2);
        
        t += dt;
        resultados.push({ t: t, N: N, M: M, D: D });
    }
    
    return resultados;
}

// Método de Runge-Kutta de 4to Orden (RK4)
function metodoRK4(N0, M0, D0, params, dt, tiempoMax) {
    let t = 0;
    let N = N0, M = M0, D = D0;
    let resultados = [{ t: 0, N: N, M: M, D: D }];
    
    while (t < tiempoMax) {
        // k1
        let [k1_N, k1_M, k1_D] = sistemaEDO(t, N, M, D, params);
        
        // k2
        let [k2_N, k2_M, k2_D] = sistemaEDO(
            t + dt/2, 
            N + dt*k1_N/2, 
            M + dt*k1_M/2, 
            D + dt*k1_D/2, 
            params
        );
        
        // k3
        let [k3_N, k3_M, k3_D] = sistemaEDO(
            t + dt/2, 
            N + dt*k2_N/2, 
            M + dt*k2_M/2, 
            D + dt*k2_D/2, 
            params
        );
        
        // k4
        let [k4_N, k4_M, k4_D] = sistemaEDO(
            t + dt, 
            N + dt*k3_N, 
            M + dt*k3_M, 
            D + dt*k3_D, 
            params
        );
        
        // Actualizar
        N = N + (dt/6) * (k1_N + 2*k2_N + 2*k3_N + k4_N);
        M = M + (dt/6) * (k1_M + 2*k2_M + 2*k3_M + k4_M);
        D = D + (dt/6) * (k1_D + 2*k2_D + 2*k3_D + k4_D);
        
        t += dt;
        resultados.push({ t: t, N: N, M: M, D: D });
    }
    
    return resultados;
}

// Función principal de simulación
function ejecutarSimulacion() {
    // Obtener parámetros
    const N0 = parseFloat(document.getElementById('N0').value);
    const M0 = parseFloat(document.getElementById('M0').value);
    const D0 = parseFloat(document.getElementById('D0').value);
    
    const params = {
        a: parseFloat(document.getElementById('param_a').value),
        b: parseFloat(document.getElementById('param_b').value),
        c: parseFloat(document.getElementById('param_c').value),
        k: parseFloat(document.getElementById('param_k').value),
        r: parseFloat(document.getElementById('param_r').value)
    };
    
    const tiempoMax = parseFloat(document.getElementById('tiempoMax').value);
    const dt = parseFloat(document.getElementById('dt').value);
    
    // Resolver con ambos métodos
    const resultadosHeun = metodoHeun(N0, M0, D0, params, dt, tiempoMax);
    const resultadosRK4 = metodoRK4(N0, M0, D0, params, dt, tiempoMax);
    
    // Analizar resultados
    analizarYMostrar(resultadosHeun, resultadosRK4, params, tiempoMax);
}

// Analizar resultados y mostrar en pantalla
function analizarYMostrar(resultadosHeun, resultadosRK4, params, tiempoMax) {
    // Usar RK4 como referencia principal
    const datos = resultadosRK4;
    
    // Calcular estadísticas
    const M_inicial = datos[0].M;
    const M_final = datos[datos.length - 1].M;
    const M_max = Math.max(...datos.map(d => d.M));
    const dia_M_max = datos.find(d => d.M === M_max).t;
    
    const N_inicial = datos[0].N;
    const N_final = datos[datos.length - 1].N;
    
    const D_inicial = datos[0].D;
    const D_final = datos[datos.length - 1].D;
    const D_max = Math.max(...datos.map(d => d.D));
    
    // Determinar tendencia final (últimos 10% de datos)
    const ultimosDatos = datos.slice(-Math.floor(datos.length * 0.1));
    const M_promedio_final = ultimosDatos.reduce((sum, d) => sum + d.M, 0) / ultimosDatos.length;
    const M_promedio_inicial = datos.slice(0, Math.floor(datos.length * 0.1)).reduce((sum, d) => sum + d.M, 0) / Math.floor(datos.length * 0.1);
    
    // 1. Semáforo de Estado Social
    const semaforo = document.getElementById('semaforoSocial');
    const textoSemaforo = document.getElementById('textoSemaforo');
    const subtextoSemaforo = document.getElementById('subtextoSemaforo');
    
    if (M_final > M_inicial * 3) {
        semaforo.className = "alert text-center mb-4 alert-danger";
        textoSemaforo.innerText = "🔴 MASIFICACIÓN DEL CONFLICTO";
        subtextoSemaforo.innerText = `Los manifestantes aumentaron de ${M_inicial.toFixed(0)}K a ${M_final.toFixed(0)}K personas (${((M_final/M_inicial - 1)*100).toFixed(0)}% más). El conflicto se intensificó significativamente.`;
    } else if (M_final > M_inicial * 1.5) {
        semaforo.className = "alert text-center mb-4 alert-warning";
        textoSemaforo.innerText = "🟡 ESCALADA MODERADA";
        subtextoSemaforo.innerText = `Los manifestantes aumentaron de ${M_inicial.toFixed(0)}K a ${M_final.toFixed(0)}K personas. Hay tensión social creciente pero no masiva.`;
    } else if (M_final < M_inicial * 0.7) {
        semaforo.className = "alert text-center mb-4 alert-success";
        textoSemaforo.innerText = "🟢 CONFLICTO EN DESACTIVACIÓN";
        subtextoSemaforo.innerText = `Los manifestantes disminuyeron de ${M_inicial.toFixed(0)}K a ${M_final.toFixed(0)}K personas. El diálogo y la mediación están funcionando.`;
    } else {
        semaforo.className = "alert text-center mb-4 alert-info";
        textoSemaforo.innerText = "🔵 CONFLICTO ESTABILIZADO";
        subtextoSemaforo.innerText = `Los manifestantes se mantienen relativamente estables alrededor de ${M_final.toFixed(0)}K personas. No hay escalada ni desactivación significativa.`;
    }
    
    // 2. Graficar evolución temporal (RK4)
    graficarEvolucion(datos);
    
    // 3. Comparar métodos Heun vs RK4
    graficarComparacion(resultadosHeun, resultadosRK4);
    
    // 4. Llenar tabla de evolución
    llenarTabla(datos);
    
    // 5. Generar respuestas a las 5 preguntas
    generarRespuestas(datos, params, M_inicial, M_final, M_max, dia_M_max, N_inicial, N_final, D_inicial, D_final, D_max, M_promedio_final, M_promedio_inicial);
    
    // 6. Estadísticas finales
    document.getElementById('estadisticasFinales').innerHTML = `
        <div class="col-md-3">
            <div class="stat-box">
                <h6>Manifestantes Máximos</h6>
                <h3 class="highlight-danger">${M_max.toFixed(0)}K</h3>
                <small>Día ${dia_M_max.toFixed(0)}</small>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stat-box">
                <h6>Mediadores Máximos</h6>
                <h3 class="highlight-info">${D_max.toFixed(0)}K</h3>
                <small>Pico de mediación</small>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stat-box">
                <h6>Neutrales Finales</h6>
                <h3 class="highlight-success">${N_final.toFixed(0)}K</h3>
                <small>De ${N_inicial.toFixed(0)}K inicial</small>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stat-box">
                <h6>Manifestantes Finales</h6>
                <h3>${M_final > M_inicial ? '<span class="highlight-danger">' : '<span class="highlight-success">'}${M_final.toFixed(0)}K</span></h3>
                <small>De ${M_inicial.toFixed(0)}K inicial</small>
            </div>
        </div>
    `;
    
    // GENERAR CONCLUSIONES DINÁMICAS
    generarConclusiones(datos, params, M_inicial, M_final, M_max, dia_M_max, N_inicial, N_final, D_inicial, D_final, D_max, M_promedio_final, M_promedio_inicial);
    
    // Mostrar resultados
    document.getElementById('resultadosCard').style.display = 'block';
    document.getElementById('resultadosCard').scrollIntoView({ behavior: 'smooth' });
}

// Graficar evolución temporal
function graficarEvolucion(datos) {
    const ctx = document.getElementById('graficoRK4').getContext('2d');
    
    if (chartRK4) chartRK4.destroy();
    
    const labels = datos.map(d => d.t.toFixed(1));
    const N_data = datos.map(d => d.N);
    const M_data = datos.map(d => d.M);
    const D_data = datos.map(d => d.D);
    
    chartRK4 = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Neutrales (N)',
                    data: N_data,
                    borderColor: 'rgba(76, 175, 80, 1)',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Manifestantes (M)',
                    data: M_data,
                    borderColor: 'rgba(244, 67, 54, 1)',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Mediadores (D)',
                    data: D_data,
                    borderColor: 'rgba(33, 150, 243, 1)',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                title: {
                    display: true,
                    text: 'Evolución de Poblaciones (Miles de personas)'
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Tiempo (días)' }
                },
                y: {
                    title: { display: true, text: 'Población (miles)' },
                    beginAtZero: true
                }
            }
        }
    });
}

// Comparar métodos Heun vs RK4
function graficarComparacion(heun, rk4) {
    const ctx = document.getElementById('graficoComparacion').getContext('2d');
    
    if (chartComparacion) chartComparacion.destroy();
    
    // Solo graficar cada 5 puntos para no saturar
    const step = 5;
    const labels = rk4.filter((_, i) => i % step === 0).map(d => d.t.toFixed(1));
    const M_heun = heun.filter((_, i) => i % step === 0).map(d => d.M);
    const M_rk4 = rk4.filter((_, i) => i % step === 0).map(d => d.M);
    
    chartComparacion = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Heun - Manifestantes',
                    data: M_heun,
                    borderColor: 'rgba(255, 152, 0, 1)',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    tension: 0.4,
                    borderDash: [5, 5]
                },
                {
                    label: 'RK4 - Manifestantes',
                    data: M_rk4,
                    borderColor: 'rgba(244, 67, 54, 1)',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                title: {
                    display: true,
                    text: 'Comparación de Precisión: Heun vs RK4'
                }
            },
            scales: {
                x: { title: { display: true, text: 'Tiempo (días)' } },
                y: { title: { display: true, text: 'Manifestantes (miles)' }, beginAtZero: true }
            }
        }
    });
}

// Llenar tabla de evolución
function llenarTabla(datos) {
    const tbody = document.getElementById('tablaEvolucion');
    tbody.innerHTML = '';
    
    // Mostrar primeros 20 días (o cada día si dt=1)
    const step = Math.max(1, Math.floor(1 / parseFloat(document.getElementById('dt').value)));
    
    datos.filter((_, i) => i % step === 0 || i === datos.length - 1).slice(0, 40).forEach(d => {
        const total = d.N + d.M + d.D;
        tbody.innerHTML += `
            <tr>
                <td>${d.t.toFixed(1)}</td>
                <td>${d.N.toFixed(1)}K</td>
                <td class="${d.M > 200 ? 'text-danger fw-bold' : ''}">${d.M.toFixed(1)}K</td>
                <td>${d.D.toFixed(1)}K</td>
                <td>${total.toFixed(1)}K</td>
            </tr>
        `;
    });
}

// Generar respuestas a las 5 preguntas
function generarRespuestas(datos, params, M_inicial, M_final, M_max, dia_M_max, N_inicial, N_final, D_inicial, D_final, D_max, M_promedio_final, M_promedio_inicial) {
    let respuestasHTML = '';
    
    // Pregunta 1: ¿El conflicto tiende a estabilizarse?
    const estabilizado = Math.abs(M_final - M_promedio_inicial) < M_promedio_inicial * 0.3;
    respuestasHTML += `
        <div class="pregunta-item">
            <div class="pregunta-texto">
                <span class="pregunta-numero">1</span>
                ¿El conflicto tiende a estabilizarse?
            </div>
            <div class="respuesta-texto">
                ${estabilizado ? 
                    `<span class="highlight-success"><strong>SÍ, el conflicto tiende a estabilizarse.</strong></span> Los manifestantes se mantienen relativamente constantes alrededor de ${M_final.toFixed(0)}K personas en los últimos días de simulación. Esto indica que el sistema alcanzó un punto de equilibrio donde las fuerzas de contagio social y mediación se compensan.` :
                    M_final > M_inicial * 1.5 ?
                    `<span class="highlight-danger"><strong>NO, el conflicto NO se estabiliza, sino que escala.</strong></span> Los manifestantes aumentaron de ${M_inicial.toFixed(0)}K a ${M_final.toFixed(0)}K personas, mostrando una tendencia creciente. El sistema no ha alcanzado equilibrio y el descontento sigue propagándose.` :
                    `<span class="highlight-success"><strong>SÍ, el conflicto tiende a desactivarse.</strong></span> Los manifestantes disminuyeron de ${M_inicial.toFixed(0)}K a ${M_final.toFixed(0)}K personas, indicando que las estrategias de mediación y diálogo están funcionando efectivamente.`
                }
            </div>
        </div>
    `;
    
    // Pregunta 2: ¿El número de manifestantes aumenta o disminuye?
    const cambio = ((M_final - M_inicial) / M_inicial * 100).toFixed(1);
    respuestasHTML += `
        <div class="pregunta-item">
            <div class="pregunta-texto">
                <span class="pregunta-numero">2</span>
                ¿El número de manifestantes aumenta o disminuye?
            </div>
            <div class="respuesta-texto">
                El número de manifestantes <span class="${M_final > M_inicial ? 'highlight-danger' : 'highlight-success'}"><strong>${M_final > M_inicial ? 'AUMENTA' : 'DISMINUYE'}</strong></span> un <strong>${Math.abs(cambio)}%</strong> durante el período simulado.
                <br><br>
                <strong>Evolución:</strong><br>
                • Inicio: ${M_inicial.toFixed(0)}K manifestantes<br>
                • Pico máximo: ${M_max.toFixed(0)}K manifestantes (día ${dia_M_max.toFixed(0)})<br>
                • Final: ${M_final.toFixed(0)}K manifestantes<br>
                <br>
                ${M_final > M_inicial ? 
                    `El contagio social (parámetro a = ${params.a}) es más fuerte que la mediación (parámetro c = ${params.c}), lo que permite que más ciudadanos neutrales se sumen a las protestas de las que regresan a la neutralidad.` :
                    `La mediación y el diálogo (parámetros b = ${params.b} y c = ${params.c}) son efectivos para reducir el número de manifestantes, logrando que personas retornen a la neutralidad o dejen de participar activamente.`
                }
            </div>
        </div>
    `;
    
    // Pregunta 3: ¿Qué pasa si mejora la tasa de diálogo?
    respuestasHTML += `
        <div class="pregunta-item">
            <div class="pregunta-texto">
                <span class="pregunta-numero">3</span>
                ¿Qué pasa si mejora la tasa de diálogo?
            </div>
            <div class="respuesta-texto">
                En la simulación actual, la efectividad del diálogo es <strong>c = ${params.c}</strong> y la tasa de retorno a neutralidad por mediación es <strong>b = ${params.b}</strong>.
                <br><br>
                <strong>Si mejoramos estos parámetros</strong> (por ejemplo, duplicándolos a c = ${(params.c * 2).toFixed(4)} y b = ${(params.b * 2).toFixed(2)}):<br>
                • Los mediadores tendrían <strong>mayor capacidad de persuasión</strong> sobre los manifestantes activos<br>
                • Más ciudadanos neutrales <strong>retornarían a la calma</strong> gracias al diálogo efectivo<br>
                • El pico máximo de manifestantes sería <strong>menor y más temprano</strong><br>
                • El conflicto tendería a <strong>desactivarse más rápidamente</strong><br>
                <br>
                <strong>Conclusión:</strong> El diálogo efectivo es la variable más importante para desescalar conflictos sociales. Invertir en mediación comunitaria y canales de comunicación tiene un impacto directo en reducir la tensión social.
            </div>
        </div>
    `;
    
    // Pregunta 4: ¿Qué pasa si no existen mediadores?
    const sinMediadores = params.b === 0 && params.c === 0 && params.k === 0;
    respuestasHTML += `
        <div class="pregunta-item">
            <div class="pregunta-texto">
                <span class="pregunta-numero">4</span>
                ¿Qué pasa si no existen mediadores?
            </div>
            <div class="respuesta-texto">
                ${sinMediadores ?
                    `<span class="highlight-danger"><strong>En esta simulación NO HAY mediadores</strong></span> (b=0, c=0, k=0). Observamos que:` :
                    `Si elimináramos los mediadores del modelo actual (haciendo b=0, c=0, k=0):`
                }
                <br><br>
                • Los ciudadanos neutrales solo podrían salir de ese estado <strong>uniéndose a las manifestaciones</strong> (no hay quien los convenza de volver)<br>
                • Los manifestantes activos <strong>nunca disminuirían por diálogo</strong>, solo por cansancio natural<br>
                • El conflicto tendería a <strong>masificarse inevitablemente</strong> hasta que casi toda la población sea manifestante<br>
                • No habría <strong>mecanismo de desescalada</strong> institucional<br>
                <br>
                ${D_final === 0 ?
                    `<strong>Resultado actual:</strong> Con ${D_final.toFixed(0)}K mediadores, el sistema carece de capacidad de mediación. Esto es extremadamente peligroso para la estabilidad social.` :
                    `<strong>En nuestra simulación:</strong> Los mediadores alcanzaron un máximo de ${D_max.toFixed(0)}K personas, lo que ayudó a contener el conflicto. Sin ellos, la situación sería mucho peor.`
                }
            </div>
        </div>
    `;
    
    // Pregunta 5: ¿Qué parámetros hacen que el conflicto se masifique?
    respuestasHTML += `
        <div class="pregunta-item">
            <div class="pregunta-texto">
                <span class="pregunta-numero">5</span>
                ¿Qué parámetros hacen que el conflicto se masifique?
            </div>
            <div class="respuesta-texto">
                El conflicto se masifica cuando se combinan las siguientes condiciones:
                <br><br>
                <strong>🔴 Factores que intensifican el conflicto:</strong><br>
                • <strong>Tasa de contagio alta (a = ${params.a}):</strong> Si es mayor a 0.002, los ciudadanos neutrales se unen rápidamente a las marchas al ver a otros participar<br>
                • <strong>Pocos mediadores iniciales (D₀ = ${D_inicial}K):</strong> Si hay menos de 50K mediadores, no hay masa crítica para contener el descontento<br>
                • <strong>Baja efectividad del diálogo (c = ${params.c}):</strong> Si es menor a 0.003, los mediadores no logran persuadir a los manifestantes<br>
                • <strong>Alta reacción institucional lenta (k = ${params.k}):</strong> Si es menor a 0.1, no aparecen suficientes mediadores cuando el conflicto crece<br>
                <br>
                <strong>🟢 Factores que desescalan el conflicto:</strong><br>
                • <strong>Alta tasa de retorno (b = ${params.b}):</strong> Si es mayor a 0.2, los mediadores logran que muchos retornen a la neutralidad<br>
                • <strong>Diálogo efectivo (c = ${params.c}):</strong> Si es mayor a 0.005, persuade activamente a los manifestantes<br>
                • <strong>Reacción institucional rápida (k = ${params.k}):</strong> Si es mayor a 0.2, aparecen muchos mediadores cuando hay conflicto<br>
                <br>
                <strong>En nuestra simulación:</strong> ${M_final > M_inicial * 2 ? 
                    'Los parámetros actuales favorecen la masificación. Se recomienda aumentar b y c para mejorar el diálogo.' :
                    'Los parámetros actuales favorecen la desescalada. El sistema de mediación está funcionando.'}
            </div>
        </div>
    `;
    
    document.getElementById('respuestasPreguntas').innerHTML = respuestasHTML;
}

// ============================================
// FUNCIÓN: Generar Conclusión General Única (Escenario G)
// ============================================
function generarConclusiones(datos, params, M_inicial, M_final, M_max, dia_M_max, N_inicial, N_final, D_inicial, D_final, D_max, M_promedio_final, M_promedio_inicial) {
    const cambio = ((M_final - M_inicial) / M_inicial * 100).toFixed(1);
    const estadoGeneral = M_final > M_inicial * 3 ? 'MASIFICACIÓN' : (M_final > M_inicial * 1.5 ? 'ESCALADA' : (M_final < M_inicial * 0.7 ? 'DESACTIVACIÓN' : 'ESTABILIZACIÓN'));
    const colorEstado = M_final > M_inicial * 3 ? 'danger' : (M_final > M_inicial * 1.5 ? 'warning' : (M_final < M_inicial * 0.7 ? 'success' : 'info'));
    const estabilizado = Math.abs(M_final - M_promedio_inicial) < M_promedio_inicial * 0.3;
    
    let html = `
        <div class="alert bg-white border-start border-4 border-${colorEstado} text-dark mb-4 shadow-sm">
            <h4 class="fw-bold mb-3 text-${colorEstado}">
                <i class="fas fa-flag-checkered me-2"></i>Conclusión General del Escenario G
            </h4>
            <p class="mb-0" style="font-size: 1.05rem; line-height: 1.7; color: #000000; text-align: justify; text-justify: inter-word;">
                El análisis numérico del modelo de dinámica social en La Paz revela un estado de <strong>${estadoGeneral}</strong> del conflicto durante el período simulado. 
                ${M_final > M_inicial * 3 ? 
                    'Los manifestantes aumentaron significativamente de ' + M_inicial.toFixed(0) + 'K a ' + M_final.toFixed(0) + 'K personas (un ' + cambio + '% más), alcanzando un pico máximo de ' + M_max.toFixed(0) + 'K manifestantes el día ' + dia_M_max.toFixed(0) + ', lo que demuestra que el conflicto se masificó y las estrategias de mediación no fueron suficientes para contener el descontento social.' :
                  M_final > M_inicial * 1.5 ?
                    'Los manifestantes aumentaron de ' + M_inicial.toFixed(0) + 'K a ' + M_final.toFixed(0) + 'K personas (un ' + cambio + '% más), alcanzando un pico de ' + M_max.toFixed(0) + 'K manifestantes el día ' + dia_M_max.toFixed(0) + ', indicando una escalada moderada donde la tensión social crece pero no alcanza niveles masivos.' :
                  M_final < M_inicial * 0.7 ?
                    'Los manifestantes disminuyeron de ' + M_inicial.toFixed(0) + 'K a ' + M_final.toFixed(0) + 'K personas (un ' + Math.abs(cambio) + '% menos), demostrando que las estrategias de mediación y diálogo están funcionando efectivamente para desactivar el conflicto.' :
                    'Los manifestantes se mantienen relativamente estables alrededor de ' + M_final.toFixed(0) + 'K personas, indicando que el sistema alcanzó un punto de equilibrio donde las fuerzas de contagio social y mediación se compensan mutuamente.'
                }
                El modelo matemático, resuelto mediante los <strong>métodos de Heun y Runge-Kutta de cuarto orden (RK4)</strong>, demuestra que la evolución del conflicto depende críticamente de cinco parámetros: la tasa de contagio social (a = ${params.a}), la efectividad del retorno a la neutralidad (b = ${params.b}), la efectividad del diálogo (c = ${params.c}), la reacción institucional (k = ${params.k}) y el desgaste de los mediadores (r = ${params.r}). 
                ${params.a > 0.002 ? 
                    'La alta tasa de contagio (a = ' + params.a + ') facilita que los ciudadanos neutrales se unan rápidamente a las manifestaciones al ver a otros participar, acelerando la propagación del descontento.' :
                    'La tasa de contagio moderada (a = ' + params.a + ') permite que el descontento se propague de manera controlada, sin generar una adhesión masiva inmediata.'
                }
                ${params.c < 0.003 ? 
                    'La baja efectividad del diálogo (c = ' + params.c + ') indica que los mediadores no logran persuadir efectivamente a los manifestantes, lo que dificulta la desescalada del conflicto.' :
                    'La efectividad del diálogo (c = ' + params.c + ') permite que los mediadores persuadan activamente a los manifestantes, contribuyendo a reducir la tensión social.'
                }
                ${params.b < 0.1 ? 
                    'La baja tasa de retorno a la neutralidad (b = ' + params.b + ') significa que pocos ciudadanos convencidos por los mediadores regresan efectivamente a la calma, limitando la capacidad de desactivación del conflicto.' :
                    'La alta tasa de retorno a la neutralidad (b = ' + params.b + ') demuestra que los mediadores logran que muchos ciudadanos regresen efectivamente a la calma, fortaleciendo la desescalada.'
                }
                ${D_final === 0 ? 
                    'La ausencia total de mediadores (D₀ = 0) elimina cualquier mecanismo institucional de desescalada, haciendo que el conflicto tienda inevitablemente a la masificación hasta que casi toda la población se una a las manifestaciones.' :
                    'Los mediadores alcanzaron un máximo de ' + D_max.toFixed(0) + 'K personas, lo que ' + (D_max > D_inicial * 2 ? 'demuestra una reacción institucional significativa ante el conflicto, aunque ' : 'proporciona ') + (M_final > M_inicial ? 'no fue suficiente para contener completamente el descontento.' : 'fue suficiente para estabilizar o reducir el conflicto.')
                }
                La comparación entre los métodos numéricos revela que <strong>RK4 proporciona una solución más precisa y estable</strong> que el método de Heun, especialmente cuando el sistema presenta no linealidades fuertes o cambios rápidos en las poblaciones, mientras que Heun, aunque más rápido computacionalmente, puede acumular errores significativos en simulaciones prolongadas. 
                Este modelo demuestra que los <strong>conflictos sociales pueden analizarse cuantitativamente</strong> mediante ecuaciones diferenciales, proporcionando insights valiosos para la toma de decisiones: invertir en mediación comunitaria efectiva (aumentar b y c), fortalecer la reacción institucional rápida (aumentar k), y reducir el desgaste de los mediadores (disminuir r) son estrategias matemáticamente fundamentadas para desescalar conflictos sociales y promover la estabilidad. 
                Finalmente, este ejercicio ilustra cómo los <strong>métodos numéricos trascienden las aplicaciones tradicionales</strong> y se convierten en herramientas poderosas para comprender fenómenos sociales complejos, permitiendo simular escenarios, evaluar estrategias y anticipar consecuencias antes de implementar políticas públicas en contextos de crisis real.
            </p>
        </div>
    `;
    
    // Insertar en el DOM
    document.getElementById('contenidoConclusiones').innerHTML = html;
    document.getElementById('conclusionesCard').style.display = 'block';
}

// Inicialización
window.onload = function() {
    // Valores por defecto ya están en el HTML
};