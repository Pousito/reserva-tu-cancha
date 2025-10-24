// Funciones para Punto Soccer Canchas Sintéticas

function mostrarInfoCamarines() {
    const modal = document.createElement('div');
    modal.className = 'punto-soccer-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🏠 Camarines</h3>
                <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
            </div>
            <div class="modal-body">
                <p>El complejo cuenta con camarines para que los jugadores se cambien cómodamente antes y después del partido.</p>
                <ul>
                    <li>✅ Vestuarios separados para hombres y mujeres</li>
                    <li>✅ Duchas con agua caliente</li>
                    <li>✅ Casilleros para guardar pertenencias</li>
                    <li>✅ Espejos y bancos</li>
                </ul>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function mostrarInfoQuincho() {
    const modal = document.createElement('div');
    modal.className = 'punto-soccer-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🍖 Quincho / Sala Común</h3>
                <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
            </div>
            <div class="modal-body">
                <p>Espacio común disponible para uso con previo aviso. Ideal para asados y reuniones después del fútbol.</p>
                <ul>
                    <li>✅ Mesas y sillas para grupos</li>
                    <li>✅ Parrilla para asados</li>
                    <li>✅ Refrigerador disponible</li>
                    <li>✅ Espacio techado</li>
                    <li>⚠️ <strong>Uso sujeto a disponibilidad</strong></li>
                </ul>
                <p><strong>Nota:</strong> Para usar el quincho, contacta con el complejo con anticipación.</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}
