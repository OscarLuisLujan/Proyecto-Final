// ===============================
// ESCENARIO A
// Sistemas de ecuaciones lineales
// ===============================

const zonasA = [
  "Zona Centro - San Pedro",
  "Zona Sur - Obrajes",
  "Zona Norte - Ceja",
];

const productosA = {
  huevo: {
    nombre: "Huevo",
    unidad: "maples/día",
    demanda: [260, 170, 380],
    precioAntes: "Bs 23-33/maple",
    precioCrisis: "Bs 60-65/maple",
  },
  pollo: {
    nombre: "Pollo",
    unidad: "unidades/día",
    demanda: [240, 140, 330],
    precioAntes: "Bs 50-55/unidad",
    precioCrisis: "Bs 100-125/unidad",
  },
  papa: {
    nombre: "Papa",
    unidad: "arrobas/día",
    demanda: [180, 110, 260],
    precioAntes: "Bs 40-45/arroba",
    precioCrisis: "Variable según mercado",
  },
  aceite: {
    nombre: "Aceite",
    unidad: "bidones/día",
    demanda: [130, 70, 170],
    precioAntes: "Bs 95/bidón amarillo",
    precioCrisis: "Bs 115/bidón amarillo",
  },
  combustible: {
    nombre: "Combustible",
    unidad: "litros/día",
    demanda: [1700, 1100, 2100],
    precioAntes: "Referencia regulada",
    precioCrisis: "Afectado por disponibilidad",
  },
};

const matrizBaseA = [
  [6, -1, -1],
  [-1, 7, -1],
  [-1, -1, 6],
];

let ultimoNormalA = null;

// ===============================
// FUNCIONES GENERALES
// ===============================

function cloneVector(v) {
  return v.map(Number);
}

function cloneMatrix(A) {
  return A.map((r) => r.map(Number));
}

function dot(a, b) {
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

function matVec(A, x) {
  return A.map((row) => dot(row, x));
}

function maxAbsDiff(a, b) {
  return Math.max(...a.map((v, i) => Math.abs(v - b[i])));
}

function fmt(n) {
  return Number(n).toFixed(4);
}

// ===============================
// MÉTODOS NUMÉRICOS ESCENARIO A
// ===============================

function jacobi(A, b, tol, maxIter) {
  const n = b.length;
  let x = Array(n).fill(0);
  let iters = [];

  for (let k = 1; k <= maxIter; k++) {
    let xn = Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) {
        if (j !== i) s += A[i][j] * x[j];
      }
      xn[i] = (b[i] - s) / A[i][i];
    }

    let error = maxAbsDiff(xn, x);
    iters.push({ iter: k, x: [...xn], error });
    x = xn;

    if (error < tol) break;
  }

  return { solucion: x, iteraciones: iters };
}

function gaussSeidel(A, b, tol, maxIter) {
  const n = b.length;
  let x = Array(n).fill(0);
  let iters = [];

  for (let k = 1; k <= maxIter; k++) {
    let old = [...x];

    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) {
        if (j !== i) s += A[i][j] * x[j];
      }
      x[i] = (b[i] - s) / A[i][i];
    }

    let error = maxAbsDiff(x, old);
    iters.push({ iter: k, x: [...x], error });

    if (error < tol) break;
  }

  return { solucion: x, iteraciones: iters };
}

function sor(A, b, omega, tol, maxIter) {
  const n = b.length;
  let x = Array(n).fill(0);
  let iters = [];

  for (let k = 1; k <= maxIter; k++) {
    let old = [...x];

    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) {
        if (j !== i) s += A[i][j] * x[j];
      }

      let gs = (b[i] - s) / A[i][i];
      x[i] = (1 - omega) * x[i] + omega * gs;
    }

    let error = maxAbsDiff(x, old);
    iters.push({ iter: k, x: [...x], error });

    if (error < tol) break;
  }

  return { solucion: x, iteraciones: iters };
}

function luSolve(A, b) {
  const n = A.length;

  const L = Array.from({ length: n }, () => Array(n).fill(0));
  const U = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    L[i][i] = 1;
  }

  for (let j = 0; j < n; j++) {
    for (let i = 0; i <= j; i++) {
      let sum = 0;
      for (let k = 0; k < i; k++) {
        sum += L[i][k] * U[k][j];
      }
      U[i][j] = A[i][j] - sum;
    }

    for (let i = j + 1; i < n; i++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * U[k][j];
      }

      if (Math.abs(U[j][j]) < 1e-12) {
        throw new Error("Pivote cero en LU");
      }

      L[i][j] = (A[i][j] - sum) / U[j][j];
    }
  }

  let y = Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < i; k++) {
      s += L[i][k] * y[k];
    }
    y[i] = b[i] - s;
  }

  let x = Array(n).fill(0);

  for (let i = n - 1; i >= 0; i--) {
    let s = 0;
    for (let k = i + 1; k < n; k++) {
      s += U[i][k] * x[k];
    }
    x[i] = (y[i] - s) / U[i][i];
  }

  return {
    solucion: x,
    iteraciones: [{ iter: 1, x: [...x], error: 0 }],
  };
}

function gradienteConjugado(A, b, tol, maxIter) {
  let x = Array(b.length).fill(0);
  let r = cloneVector(b);
  let p = cloneVector(r);
  let rsold = dot(r, r);
  let iters = [];

  for (let k = 1; k <= maxIter; k++) {
    let Ap = matVec(A, p);
    let den = dot(p, Ap);

    if (Math.abs(den) < 1e-12) {
      throw new Error("División entre cero en Gradiente Conjugado");
    }

    let alpha = rsold / den;

    x = x.map((xi, i) => xi + alpha * p[i]);
    r = r.map((ri, i) => ri - alpha * Ap[i]);

    let rsnew = dot(r, r);
    let error = Math.sqrt(rsnew);

    iters.push({ iter: k, x: [...x], error });

    if (error < tol) break;

    p = r.map((ri, i) => ri + (rsnew / rsold) * p[i]);
    rsold = rsnew;
  }

  return { solucion: x, iteraciones: iters };
}

function resolverSistema(m, A, b, tol, maxIter, omega) {
  if (m === "jacobi") return jacobi(A, b, tol, maxIter);
  if (m === "gaussSeidel") return gaussSeidel(A, b, tol, maxIter);
  if (m === "sor") return sor(A, b, omega, tol, maxIter);
  if (m === "lu") return luSolve(A, b);
  return gradienteConjugado(A, b, tol, maxIter);
}

function nombreMetodo(m) {
  return {
    jacobi: "Jacobi",
    gaussSeidel: "Gauss-Seidel",
    sor: "SOR",
    lu: "LU",
    gradienteConjugado: "Gradiente Conjugado",
  }[m];
}

// ===============================
// INICIALIZACIÓN ESCENARIO A
// ===============================

function inicializarEscenarioA() {
  const sel = document.getElementById("productoA");

  if (!sel) return;

  sel.innerHTML = "";

  Object.keys(productosA).forEach((k) => {
    const op = document.createElement("option");
    op.value = k;
    op.textContent = productosA[k].nombre;
    sel.appendChild(op);
  });

  mostrarMatrizA(matrizBaseA);
  mostrarDemandaBaseA();
  calcularEscenarioA(false);
}

function leerMatrizA() {
  let A = [];

  for (let i = 0; i < 3; i++) {
    A[i] = [];
    for (let j = 0; j < 3; j++) {
      A[i][j] = Number(document.getElementById(`matA_${i}_${j}`).value);
    }
  }

  return A;
}

function mostrarMatrizA(A) {
  const el = document.getElementById("matrizAContainer");

  if (!el) return;

  let html =
    '<div class="table-wrap"><table><thead><tr><th>Zona/Ecuación</th>' +
    zonasA
      .map((z, i) => `<th>x${i + 1}<br>${z.replace("Zona ", "")}</th>`)
      .join("") +
    "</tr></thead><tbody>";

  A.forEach((row, i) => {
    html +=
      `<tr><th>${zonasA[i]}</th>` +
      row
        .map(
          (v, j) =>
            `<td><input id="matA_${i}_${j}" type="number" step="0.01" value="${v}"></td>`,
        )
        .join("") +
      "</tr>";
  });

  el.innerHTML = html + "</tbody></table></div>";
}

function mostrarDemandaBaseA() {
  const pk = document.getElementById("productoA")?.value || "huevo";
  const p = productosA[pk];
  mostrarDemandaA(p, cloneVector(p.demanda), false);
}

function restaurarEscenarioA() {
  mostrarMatrizA(matrizBaseA);
  mostrarDemandaBaseA();
  calcularEscenarioA(false);
}

// ===============================
// VALIDACIÓN Y ANÁLISIS ESCENARIO A
// ===============================

function residuoSistema(A, x, b) {
  const Ax = matVec(A, x);
  const residuos = Ax.map((v, i) => v - b[i]);
  const norma = Math.sqrt(residuos.reduce((s, r) => s + r * r, 0));

  return { Ax, residuos, norma };
}

function validarSistemaA(A, b, metodo) {
  for (let i = 0; i < A.length; i++) {
    if (Math.abs(A[i][i]) < 1e-12) {
      return {
        ok: false,
        mensaje:
          "La matriz tiene un valor cero o muy cercano a cero en la diagonal principal. Esto puede causar división entre cero en métodos iterativos o problemas en LU.",
      };
    }
  }

  let dominante = true;

  for (let i = 0; i < A.length; i++) {
    let suma = 0;

    for (let j = 0; j < A.length; j++) {
      if (i !== j) suma += Math.abs(A[i][j]);
    }

    if (Math.abs(A[i][i]) < suma) dominante = false;
  }

  let simetrica = true;

  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A.length; j++) {
      if (Math.abs(A[i][j] - A[j][i]) > 1e-9) {
        simetrica = false;
      }
    }
  }

  if (metodo === "gradienteConjugado" && !simetrica) {
    return {
      ok: false,
      dominante,
      simetrica,
      mensaje:
        "Para usar Gradiente Conjugado se recomienda que la matriz sea simétrica y definida positiva. La matriz ingresada no es simétrica, por eso este método puede no ser adecuado.",
    };
  }

  return {
    ok: true,
    dominante,
    simetrica,
    mensaje:
      "El sistema puede resolverse. La matriz fue revisada antes del cálculo.",
  };
}

function compararMetodosA(A, b, tol, maxIter, omega) {
  const metodos = ["jacobi", "gaussSeidel", "sor", "lu", "gradienteConjugado"];
  let filas = "";

  metodos.forEach((m) => {
    try {
      const r = resolverSistema(
        m,
        cloneMatrix(A),
        cloneVector(b),
        tol,
        maxIter,
        omega,
      );

      const residuo = residuoSistema(A, r.solucion, b);

      filas += `
        <tr>
          <td>${nombreMetodo(m)}</td>
          <td>${r.iteraciones.length}</td>
          <td>${fmt(r.solucion[0])}</td>
          <td>${fmt(r.solucion[1])}</td>
          <td>${fmt(r.solucion[2])}</td>
          <td>${fmt(r.iteraciones.at(-1).error)}</td>
          <td>${fmt(residuo.norma)}</td>
        </tr>
      `;
    } catch (e) {
      filas += `
        <tr>
          <td>${nombreMetodo(m)}</td>
          <td colspan="6">No se pudo aplicar: ${e.message}</td>
        </tr>
      `;
    }
  });

  const cont = document.getElementById("comparacionMetodosA");

  if (!cont) return;

  cont.innerHTML = `
    <p>
      Esta tabla compara los métodos aplicados al mismo sistema lineal.
      Se observa la solución obtenida, el número de iteraciones, el error final
      y el residuo numérico ||Ax-b||. Un residuo pequeño indica que la solución
      satisface mejor el sistema original.
    </p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Método</th>
            <th>Iteraciones</th>
            <th>x1 San Pedro</th>
            <th>x2 Obrajes</th>
            <th>x3 Ceja</th>
            <th>Error final</th>
            <th>Residuo ||Ax-b||</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;
}

function mostrarValidacionA(A, b, x, metodo) {
  const validacion = validarSistemaA(A, b, metodo);
  const residuo = residuoSistema(A, x, b);
  const cont = document.getElementById("validacionA");

  if (!cont) return;

  cont.innerHTML = `
    <p><strong>Revisión del sistema:</strong> ${validacion.mensaje}</p>

    <p>
      <strong>Dominancia diagonal:</strong>
      ${
        validacion.dominante
          ? "Sí presenta dominancia diagonal, lo que favorece la convergencia de métodos iterativos como Jacobi, Gauss-Seidel y SOR."
          : "No presenta dominancia diagonal clara, por lo que algunos métodos iterativos podrían tardar más o no converger."
      }
    </p>

    <p>
      <strong>Simetría:</strong>
      ${
        validacion.simetrica
          ? "La matriz es simétrica, condición favorable para aplicar Gradiente Conjugado."
          : "La matriz no es simétrica; por ello Gradiente Conjugado debe usarse con cuidado."
      }
    </p>

    <p>
      <strong>Residuo numérico ||Ax-b||:</strong> ${fmt(residuo.norma)}.
      Este valor mide qué tan cerca está la solución calculada de cumplir el sistema original.
    </p>
  `;
}

function analisisMetodoA(metodo) {
  const textos = {
    jacobi: `
      Jacobi es útil para observar el proceso iterativo paso a paso, porque cada nueva aproximación
      se calcula usando solamente los valores de la iteración anterior. Su ventaja es que es simple
      y fácil de interpretar, aunque puede necesitar más iteraciones que Gauss-Seidel o SOR.
    `,
    gaussSeidel: `
      Gauss-Seidel mejora a Jacobi porque utiliza inmediatamente los valores actualizados dentro
      de la misma iteración. Por eso, en muchos sistemas, converge más rápido y resulta adecuado
      cuando se busca una solución iterativa eficiente.
    `,
    sor: `
      SOR es una versión acelerada de Gauss-Seidel. El factor omega permite controlar la relajación:
      si se elige bien, puede reducir el número de iteraciones; si se elige mal, puede volver menos
      estable el proceso. Por eso se compara con otros métodos.
    `,
    lu: `
      LU es un método directo. No depende de tolerancia ni de iteraciones sucesivas, sino que factoriza
      la matriz en matrices triangulares. Es conveniente cuando se desea una solución directa y clara.
    `,
    gradienteConjugado: `
      Gradiente Conjugado es eficiente para matrices simétricas y definidas positivas. En este escenario
      se justifica porque la matriz base es simétrica y con dominancia diagonal. El residuo permite verificar
      la precisión de la solución obtenida.
    `,
  };

  const cont = document.getElementById("analisisMetodoA");

  if (!cont) return;

  cont.innerHTML = `
    <p><strong>Justificación del método seleccionado:</strong></p>
    <p>${textos[metodo]}</p>
  `;
}

// ===============================
// CÁLCULO ESCENARIO A
// ===============================

function calcularEscenarioA(conBloqueo) {
  const pk = document.getElementById("productoA").value;
  const m = document.getElementById("metodoA").value;
  const tol = Number(document.getElementById("tolA").value);
  const maxIter = Number(document.getElementById("maxIterA").value);
  const omega = Number(document.getElementById("omegaA").value);
  const aumento = Number(document.getElementById("aumentoA").value) / 100;
  const p = productosA[pk];

  let A = leerMatrizA();
  let b = cloneVector(p.demanda);

  if (conBloqueo) {
    b = b.map((v, i) => (i === 2 ? v * (1 + aumento) : v * (1 + aumento / 2)));

    A[0][1] *= 0.5;
    A[1][0] *= 0.5;

    mostrarMatrizA(A);
  }

  const validacion = validarSistemaA(A, b, m);

  if (!validacion.ok) {
    document.getElementById("resultadoAContainer").innerHTML = `
      <div class="error-box">${validacion.mensaje}</div>
    `;
    return;
  }

  const res = resolverSistema(m, A, b, tol, maxIter, omega);

  if (!conBloqueo) {
    ultimoNormalA = { x: [...res.solucion], b: [...b] };
  }

  mostrarDemandaA(p, b, conBloqueo);
  mostrarResultadoA(p, b, res.solucion);
  mostrarIteracionesA(res.iteraciones, m);
  graficoBarras("graficoA", zonasA, b, res.solucion, "Demanda", "Distribución");
  interpretarA(p, m, b, res, conBloqueo);
  responderPreguntasA(p, m, b, res, conBloqueo);
  mostrarAlgoritmoA(m);

  compararMetodosA(A, b, tol, maxIter, omega);
  mostrarValidacionA(A, b, res.solucion, m);
  analisisMetodoA(m);
}

function estadoZona(d, b) {
  if (d < -Math.abs(b) * 0.05) {
    return { txt: "Déficit relativo", cls: "deficit" };
  }

  if (d > Math.abs(b) * 0.05) {
    return { txt: "Superávit relativo", cls: "surplus" };
  }

  return { txt: "Equilibrio aproximado", cls: "balanced" };
}

function mostrarDemandaA(p, b, bl) {
  document.getElementById("demandaAContainer").innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Zona</th>
            <th>Demanda (${p.unidad})</th>
            <th>Escenario</th>
          </tr>
        </thead>
        <tbody>
          ${zonasA
            .map(
              (z, i) => `
              <tr>
                <td>${z}</td>
                <td>${fmt(b[i])}</td>
                <td>${bl ? "Bloqueo/aumento" : "Normal"}</td>
              </tr>
            `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function mostrarResultadoA(p, b, x) {
  document.getElementById("resultadoAContainer").innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Zona</th>
            <th>Demanda</th>
            <th>Distribución calculada</th>
            <th>Diferencia</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${zonasA
            .map((z, i) => {
              let d = x[i] - b[i];
              let e = estadoZona(d, b[i]);

              return `
                <tr>
                  <td>${z}</td>
                  <td>${fmt(b[i])}</td>
                  <td>${fmt(x[i])}</td>
                  <td>${fmt(d)}</td>
                  <td><span class="${e.cls}">${e.txt}</span></td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function mostrarIteracionesA(iters, m) {
  if (m === "lu") {
    document.getElementById("iteracionesAContainer").innerHTML = `
      <p>
        LU es un método directo: no realiza iteraciones sucesivas.
        La tabla de comparación muestra la solución final y el residuo numérico.
      </p>
    `;
    return;
  }

  document.getElementById("iteracionesAContainer").innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Iter.</th>
            ${zonasA.map((_, i) => `<th>x${i + 1}</th>`).join("")}
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          ${iters
            .slice(0, 25)
            .map(
              (it) => `
              <tr>
                <td>${it.iter}</td>
                ${it.x.map((v) => `<td>${fmt(v)}</td>`).join("")}
                <td>${fmt(it.error)}</td>
              </tr>
            `,
            )
            .join("")}
        </tbody>
      </table>
    </div>

    ${
      iters.length > 25
        ? `<p class="small">Se muestran 25 iteraciones de ${iters.length}.</p>`
        : ""
    }
  `;
}

function zonaMasAfectada(b, x) {
  let idx = 0;
  let menor = Infinity;

  for (let i = 0; i < b.length; i++) {
    let d = x[i] - b[i];

    if (d < menor) {
      menor = d;
      idx = i;
    }
  }

  return { idx, zona: zonasA[idx], dif: menor };
}

function sensibilidadTexto(x) {
  if (!ultimoNormalA) {
    return "Para medir sensibilidad, primero calcula el escenario normal y después simula bloqueo/aumento.";
  }

  let cambio = x.map((v, i) => Math.abs(v - ultimoNormalA.x[i]));
  let prom = cambio.reduce((s, v) => s + v, 0) / cambio.length;
  let base =
    ultimoNormalA.x.reduce((s, v) => s + Math.abs(v), 0) /
    ultimoNormalA.x.length;

  let pct = base ? (prom / base) * 100 : 0;

  return pct > 10
    ? `El sistema es sensible: el cambio promedio respecto al cálculo normal es ${fmt(pct)}%.`
    : `El sistema es relativamente estable: el cambio promedio respecto al cálculo normal es ${fmt(pct)}%.`;
}

function interpretarA(p, m, b, res, bl) {
  const x = res.solucion;
  const af = zonaMasAfectada(b, x);

  document.getElementById("interpretacionA").innerHTML = `
    <p>
      Se resolvió el sistema lineal para <strong>${p.nombre}</strong>
      con el método <strong>${nombreMetodo(m)}</strong>. La demanda se representa
      mediante el vector b y la distribución calculada mediante el vector x.
    </p>

    <p>
      Escenario analizado:
      <strong>${bl ? "bloqueo/aumento de demanda" : "normal"}</strong>.
      La zona más afectada en esta simulación es
      <strong>${af.zona}</strong>.
    </p>

    <p>
      Iteraciones realizadas: <strong>${res.iteraciones.length}</strong>.
      Error final: <strong>${fmt(res.iteraciones.at(-1).error)}</strong>.
    </p>

    <p>${sensibilidadTexto(x)}</p>
  `;
}

function responderPreguntasA(p, m, b, res, bl) {
  const x = res.solucion;
  const af = zonaMasAfectada(b, x);

  let comparacionBloqueo = "";
  let estabilidad = "";
  let cambioDemanda = "";

  if (ultimoNormalA && bl) {
    const cambios = x.map((valor, i) => Math.abs(valor - ultimoNormalA.x[i]));
    const promedioCambio = cambios.reduce((s, v) => s + v, 0) / cambios.length;

    const promedioNormal =
      ultimoNormalA.x.reduce((s, v) => s + Math.abs(v), 0) /
      ultimoNormalA.x.length;

    const porcentaje =
      promedioNormal === 0 ? 0 : (promedioCambio / promedioNormal) * 100;

    comparacionBloqueo = `
      Con el bloqueo/aumento, la distribución cambió respecto al escenario normal:
      San Pedro pasó de ${fmt(ultimoNormalA.x[0])} a ${fmt(x[0])},
      Obrajes pasó de ${fmt(ultimoNormalA.x[1])} a ${fmt(x[1])}
      y Ceja pasó de ${fmt(ultimoNormalA.x[2])} a ${fmt(x[2])}.
    `;

    estabilidad =
      porcentaje > 10
        ? `El sistema es sensible, porque el cambio promedio respecto al escenario normal fue de ${fmt(porcentaje)}%.`
        : `El sistema es relativamente estable, porque el cambio promedio respecto al escenario normal fue de ${fmt(porcentaje)}%.`;

    cambioDemanda = `
      La solución cambió con el aumento de demanda. El cambio promedio fue de ${fmt(porcentaje)}%
      respecto al escenario normal.
    `;
  } else if (!bl) {
    comparacionBloqueo = `
      En este cálculo todavía no se aplicó bloqueo. Para responder con comparación,
      primero se toma este resultado como escenario normal y luego se debe presionar
      “Simular bloqueo/aumento”.
    `;

    estabilidad = `
      Para evaluar estabilidad se necesita comparar este cálculo normal con una simulación
      de bloqueo/aumento.
    `;

    cambioDemanda = `
      Todavía no se aplicó aumento de demanda. Presiona “Simular bloqueo/aumento”
      para comparar cuánto cambia la solución.
    `;
  } else {
    comparacionBloqueo = `
      Se aplicó bloqueo/aumento, pero no existe un cálculo normal previo para comparar.
      Primero ejecuta “Calcular normal” y luego “Simular bloqueo/aumento”.
    `;

    estabilidad = `
      No se puede calcular la sensibilidad porque falta el escenario normal de referencia.
    `;

    cambioDemanda = `
      No se puede medir cuánto cambió la solución porque falta el escenario normal.
    `;
  }

  document.getElementById("preguntasA").innerHTML = `
    <p>
      <strong>• ¿Cuánto debe enviarse a cada zona?</strong><br>
      Según ${nombreMetodo(m)}, debe enviarse aproximadamente
      ${fmt(x[0])} ${p.unidad} a San Pedro,
      ${fmt(x[1])} ${p.unidad} a Obrajes y
      ${fmt(x[2])} ${p.unidad} a Ceja.
    </p>

    <p>
      <strong>• ¿Qué pasa si una ruta se bloquea?</strong><br>
      ${comparacionBloqueo}
    </p>

    <p>
      <strong>• ¿Qué zona queda más afectada?</strong><br>
      La zona más afectada es <strong>${af.zona}</strong>,
      porque tiene la diferencia más baja entre distribución calculada y demanda.
    </p>

    <p>
      <strong>• ¿El sistema es estable o sensible a pequeños cambios?</strong><br>
      ${estabilidad}
    </p>

    <p>
      <strong>• ¿La solución cambia mucho si la demanda aumenta?</strong><br>
      ${cambioDemanda}
    </p>
  `;

  document.getElementById("conclusionA").innerHTML = `
    <p>
      <strong>Conclusión:</strong> el Escenario A permite estimar la distribución
      para San Pedro, Obrajes y Ceja mediante métodos numéricos. El método utilizado fue
      ${nombreMetodo(m)} y la zona que requiere mayor atención es ${af.zona}.
      La matriz editable permite analizar cómo pequeños cambios en rutas o demanda
      afectan la solución. Además, la comparación de métodos y el residuo numérico
      permiten evaluar la precisión de los resultados.
    </p>
  `;
}

function mostrarAlgoritmoA(m) {
  const t = {
    jacobi:
      "Jacobi usa los valores de la iteración anterior. La tolerancia y el máximo de iteraciones controlan cuándo detener el cálculo.",
    gaussSeidel:
      "Gauss-Seidel actualiza los valores dentro de la misma iteración; normalmente converge más rápido que Jacobi.",
    sor:
      "SOR es Gauss-Seidel con relajación. El factor ω ajusta cuánto se acelera o suaviza el cambio.",
    lu:
      "LU es directo: factoriza A en L y U. No depende de tolerancia ni de máximo de iteraciones.",
    gradienteConjugado:
      "Gradiente Conjugado usa residuos y direcciones conjugadas; funciona bien con matrices simétricas positivas.",
  };

  document.getElementById("algoritmoA").innerHTML = `<p>${t[m]}</p>`;
}

// ===============================
// ESCENARIO B
// Ecuaciones diferenciales
// ===============================

function fReserva(R, E, c) {
  return E - c * R;
}

function eulerReserva(R0, E, c, h, tf) {
  let data = [];
  let R = R0;

  for (let t = 0; t <= tf + 1e-9; t += h) {
    data.push({ t, y: R, f: fReserva(R, E, c) });
    R = R + h * fReserva(R, E, c);
  }

  return data;
}

function heunReserva(R0, E, c, h, tf) {
  let data = [];
  let R = R0;

  for (let t = 0; t <= tf + 1e-9; t += h) {
    let f0 = fReserva(R, E, c);
    data.push({ t, y: R, f: f0 });

    let pred = R + h * f0;
    R = R + (h / 2) * (f0 + fReserva(pred, E, c));
  }

  return data;
}

function rk4Reserva(R0, E, c, h, tf) {
  let data = [];
  let R = R0;

  for (let t = 0; t <= tf + 1e-9; t += h) {
    let f0 = fReserva(R, E, c);
    data.push({ t, y: R, f: f0 });

    let k1 = h * fReserva(R, E, c);
    let k2 = h * fReserva(R + k1 / 2, E, c);
    let k3 = h * fReserva(R + k2 / 2, E, c);
    let k4 = h * fReserva(R + k3, E, c);

    R = R + (k1 + 2 * k2 + 2 * k3 + k4) / 6;
  }

  return data;
}

function diaCritico(data, crit) {
  let v = data.find((d) => d.y <= crit);
  return v ? v.t : null;
}

// ESTA ES LA PARTE 6 YA UBICADA CORRECTAMENTE
// Va después de diaCritico y antes de calcularEscenarioB

function compararMetodosB(eu, he, rk) {
  const ultimoEuler = eu[eu.length - 1].y;
  const ultimoHeun = he[he.length - 1].y;
  const ultimoRK4 = rk[rk.length - 1].y;

  const difEulerRK4 = Math.abs(ultimoEuler - ultimoRK4);
  const difHeunRK4 = Math.abs(ultimoHeun - ultimoRK4);

  const cont = document.getElementById("comparacionMetodosB");

  if (!cont) return;

  cont.innerHTML = `
    <p>
      Para comparar los métodos se toma como referencia RK4, porque utiliza cuatro pendientes
      intermedias en cada paso y normalmente ofrece una aproximación más estable que Euler y Heun.
    </p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Método</th>
            <th>Reserva final</th>
            <th>Diferencia respecto a RK4</th>
            <th>Interpretación</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Euler</td>
            <td>${fmt(ultimoEuler)}</td>
            <td>${fmt(difEulerRK4)}</td>
            <td>Es el método más simple; puede desviarse más cuando el paso h es grande.</td>
          </tr>
          <tr>
            <td>Heun</td>
            <td>${fmt(ultimoHeun)}</td>
            <td>${fmt(difHeunRK4)}</td>
            <td>Mejora a Euler porque usa predictor-corrector.</td>
          </tr>
          <tr>
            <td>RK4</td>
            <td>${fmt(ultimoRK4)}</td>
            <td>0.0000</td>
            <td>Se usa como referencia por su mayor estabilidad numérica.</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function analizarEstabilidadB(rk, crit, R0, E, c) {
  const inicial = rk[0].y;
  const final = rk[rk.length - 1].y;
  const diferencia = final - inicial;
  const equilibrio = c === 0 ? null : E / c;

  let tendencia = "";

  if (final <= 0) {
    tendencia = "La reserva se agota dentro del periodo simulado.";
  } else if (final <= crit) {
    tendencia = "La reserva no se agota, pero llega a un nivel crítico.";
  } else if (diferencia < 0) {
    tendencia =
      "La reserva disminuye durante el periodo simulado, pero se mantiene por encima del nivel crítico.";
  } else if (diferencia > 0) {
    tendencia = "La reserva aumenta durante el periodo simulado.";
  } else {
    tendencia = "La reserva se mantiene prácticamente constante.";
  }

  const cont = document.getElementById("estabilidadB");

  if (!cont) return;

  cont.innerHTML = `
    <p><strong>Tendencia observada:</strong> ${tendencia}</p>

    <p>
      <strong>Reserva inicial:</strong> ${fmt(inicial)} litros.
      <strong>Reserva final con RK4:</strong> ${fmt(final)} litros.
    </p>

    <p>
      <strong>Equilibrio teórico aproximado:</strong>
      ${
        equilibrio === null
          ? "No se calcula porque c = 0."
          : fmt(equilibrio) + " litros."
      }
      Este valor representa el nivel hacia el cual tendería la reserva si la entrada
      y el consumo proporcional se mantienen constantes.
    </p>

    <p>
      <strong>Análisis crítico:</strong>
      si la entrada diaria E disminuye o el factor de consumo c aumenta, el equilibrio baja
      y la reserva se acerca más rápido al nivel crítico. Por eso el modelo permite analizar
      escenarios de riesgo.
    </p>
  `;
}

function calcularEscenarioB() {
  const R0 = Number(document.getElementById("R0B").value);
  const E = Number(document.getElementById("entradaB").value);
  const c = Number(document.getElementById("consumoB").value);
  const h = Number(document.getElementById("hB").value);
  const tf = Number(document.getElementById("tfB").value);
  const crit = Number(document.getElementById("criticoB").value);

  if (h <= 0 || tf <= 0) {
    document.getElementById("resultadoBContainer").innerHTML = `
      <div class="error-box">
        El paso h y el tiempo final deben ser mayores que cero.
      </div>
    `;
    return;
  }

  const eu = eulerReserva(R0, E, c, h, tf);
  const he = heunReserva(R0, E, c, h, tf);
  const rk = rk4Reserva(R0, E, c, h, tf);

  document.getElementById("resultadoBContainer").innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Día</th>
            <th>f(t,R)</th>
            <th>Euler</th>
            <th>Heun</th>
            <th>RK4</th>
            <th>Estado RK4</th>
          </tr>
        </thead>
        <tbody>
          ${rk
            .map(
              (d, i) => `
              <tr>
                <td>${fmt(d.t)}</td>
                <td>${fmt(eu[i].f)}</td>
                <td>${fmt(eu[i].y)}</td>
                <td>${fmt(he[i].y)}</td>
                <td>${fmt(d.y)}</td>
                <td>${
                  d.y <= 0 ? "Agotado" : d.y <= crit ? "Crítico" : "Normal"
                }</td>
              </tr>
            `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  graficoLineas("graficoB", [
    {
      name: "Euler",
      color: "#ef4444",
      data: eu.map((d) => ({ x: d.t, y: d.y })),
    },
    {
      name: "Heun",
      color: "#2563eb",
      data: he.map((d) => ({ x: d.t, y: d.y })),
    },
    {
      name: "RK4",
      color: "#10b981",
      data: rk.map((d) => ({ x: d.t, y: d.y })),
    },
  ]);

  const de = diaCritico(eu, crit);
  const dh = diaCritico(he, crit);
  const dr = diaCritico(rk, crit);

  document.getElementById("interpretacionB").innerHTML = `
    <p>
      Modelo utilizado:
      <strong>R'(t) = ${E} - ${c}R(t)</strong>.
      La entrada E representa lo que llega por día y cR(t) representa el consumo proporcional.
    </p>

    ${
      dr !== null
        ? `<p>Según RK4, la reserva llega al nivel crítico aproximadamente en el día <strong>${fmt(dr)}</strong>.</p>`
        : `<p>Según RK4, la reserva no llega al nivel crítico dentro del periodo simulado.</p>`
    }

    <p>
      Euler es más simple, Heun mejora el cálculo usando predictor-corrector y RK4 usa cuatro
      pendientes intermedias, por eso suele ofrecer una aproximación más estable.
    </p>
  `;

  document.getElementById("preguntasB").innerHTML = `
    <p>
      <strong>• ¿En cuántos días la reserva llega a un nivel crítico?</strong><br>
      Euler: ${de === null ? "no llega en el periodo simulado" : fmt(de) + " días"};
      Heun: ${dh === null ? "no llega en el periodo simulado" : fmt(dh) + " días"};
      RK4: ${dr === null ? "no llega en el periodo simulado" : fmt(dr) + " días"}.
    </p>

    <p>
      <strong>• ¿Qué pasa si aumenta el consumo diario?</strong><br>
      Al aumentar c, el término cR(t) crece y la reserva baja más rápido.
    </p>

    <p>
      <strong>• ¿Qué pasa si se reduce el abastecimiento?</strong><br>
      Al reducir E, entra menos combustible por día y la reserva llega antes al nivel crítico.
    </p>

    <p>
      <strong>• ¿Qué método da una aproximación más estable?</strong><br>
      RK4 suele ser más estable porque usa cuatro pendientes por paso. Heun es intermedio
      y Euler es el más simple.
    </p>

    <p>
      <strong>• ¿Cuál es la diferencia entre Euler, Heun y RK4?</strong><br>
      Euler usa una pendiente; Heun usa predictor-corrector con promedio de pendientes;
      RK4 usa cuatro pendientes intermedias.
    </p>
  `;

  document.getElementById("conclusionB").innerHTML = `
    <p>
      <strong>Conclusión:</strong> el Escenario B permite analizar el vaciado crítico
      de una reserva de carburante mediante ecuaciones diferenciales ordinarias.
      La simulación compara Euler, Heun y Runge-Kutta de cuarto orden para observar cómo
      cambia la reserva en el tiempo. Cuando aumenta el consumo o disminuye la entrada diaria,
      la reserva se aproxima más rápido al nivel crítico. En la comparación numérica, RK4 se
      considera el método más estable porque usa cuatro evaluaciones de pendiente por paso,
      mientras que Heun mejora a Euler mediante predictor-corrector y Euler representa la
      aproximación más simple. Este módulo permite interpretar no solo el resultado final,
      sino también el comportamiento del sistema ante cambios en los parámetros.
    </p>
  `;

  compararMetodosB(eu, he, rk);
  analizarEstabilidadB(rk, crit, R0, E, c);
}

function simularMayorConsumoB() {
  document.getElementById("consumoB").value = (
    Number(document.getElementById("consumoB").value) + 0.03
  ).toFixed(2);

  calcularEscenarioB();
}

function simularMenorEntradaB() {
  document.getElementById("entradaB").value = Math.max(
    0,
    Number(document.getElementById("entradaB").value) - 150,
  );

  calcularEscenarioB();
}

function restaurarEscenarioB() {
  document.getElementById("R0B").value = 10000;
  document.getElementById("entradaB").value = 500;
  document.getElementById("consumoB").value = 0.08;
  document.getElementById("hB").value = 1;
  document.getElementById("tfB").value = 30;
  document.getElementById("criticoB").value = 3000;

  calcularEscenarioB();
}

// ===============================
// INICIALIZACIÓN GENERAL
// ===============================

window.addEventListener("DOMContentLoaded", () => {
  inicializarEscenarioA();

  if (document.getElementById("resultadoBContainer")) {
    calcularEscenarioB();
  }
});