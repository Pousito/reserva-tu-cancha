// Sistema de Filtros Dinámicos para Gráficos del Dashboard
class ChartFilters {
    constructor() {
        this.currentFilters = {
            timeRange: '7',
            complexFilter: 'all',
            sportFilter: 'all',
            dateFrom: null,
            dateTo: null
        };
        this.charts = {
            reservations: null,
            types: null,
            hours: null
        };
        this.init();
    }

    init() {
        this.createFilterPanel();
        this.setupEventListeners();
        this.loadInitialData();
    }

    createFilterPanel() {
        // Verificar si ya existen filtros para evitar duplicados
        if (document.querySelector('.chart-filters')) {
            console.log('⚠️ Los filtros ya existen, evitando duplicados');
            return;
        }

        // Crear panel de filtros para el gráfico principal
        const chartContainer = document.querySelector('.chart-container .chart-content');
        if (!chartContainer) {
            console.log('❌ No se encontró el contenedor del gráfico');
            return;
        }

        const filterHTML = `
            <div class="chart-filters mb-3">
                <div class="row g-2">
                    <div class="col-md-3">
                        <label class="form-label small">Período</label>
                        <select class="form-select form-select-sm" id="timeRangeFilter">
                            <option value="7">Últimos 7 días</option>
                            <option value="30">Últimos 30 días</option>
                            <option value="90">Últimos 3 meses</option>
                            <option value="custom">Personalizado</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small">Complejo</label>
                        <select class="form-select form-select-sm" id="complexFilter">
                            <option value="all">Todos los complejos</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small">Deporte</label>
                        <select class="form-select form-select-sm" id="sportFilter">
                            <option value="all">Todos los deportes</option>
                            <option value="futbol">Fútbol</option>
                            <option value="padel">Pádel</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label small">&nbsp;</label>
                        <div class="d-flex gap-1">
                            <button class="btn btn-primary btn-sm" onclick="chartFilters.applyFilters()">
                                <i class="fas fa-filter"></i> Aplicar
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="chartFilters.resetFilters()">
                                <i class="fas fa-undo"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="row mt-2" id="customDateRange" style="display: none;">
                    <div class="col-md-6">
                        <label class="form-label small">Desde</label>
                        <input type="date" class="form-control form-control-sm" id="dateFromFilter">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small">Hasta</label>
                        <input type="date" class="form-control form-control-sm" id="dateToFilter">
                    </div>
                </div>
            </div>
        `;

        // Insertar filtros después del header del gráfico, antes del chart-body
        const chartHeader = chartContainer.querySelector('.chart-header');
        const chartBody = chartContainer.querySelector('.chart-body');
        
        if (chartHeader && chartBody) {
            chartBody.insertAdjacentHTML('beforebegin', filterHTML);
            console.log('✅ Panel de filtros creado exitosamente');
        } else {
            console.log('❌ No se encontró el header o body del gráfico');
            console.log('Header encontrado:', !!chartHeader);
            console.log('Body encontrado:', !!chartBody);
        }
    }

    setupEventListeners() {
        // Escuchar cambios en los filtros
        document.addEventListener('change', (e) => {
            if (e.target.id === 'timeRangeFilter') {
                this.handleTimeRangeChange(e.target.value);
            }
        });

        // Cargar complejos cuando se inicialice
        this.loadComplexes();
    }

    async loadComplexes() {
        try {
            const response = await AdminUtils.authenticatedFetch(`${API_BASE}/admin/complejos`);
            if (response && response.ok) {
                const complejos = await response.json();
                const select = document.getElementById('complexFilter');
                
                if (select) {
                    // Limpiar opciones existentes (excepto "Todos los complejos")
                    const allOption = select.querySelector('option[value="all"]');
                    select.innerHTML = '';
                    if (allOption) {
                        select.appendChild(allOption);
                    }
                    
                    // Agregar complejos únicos
                    const complejosUnicos = [];
                    complejos.forEach(complejo => {
                        if (!complejosUnicos.find(c => c.id === complejo.id)) {
                            complejosUnicos.push(complejo);
                        }
                    });
                    
                    complejosUnicos.forEach(complejo => {
                        const option = document.createElement('option');
                        option.value = complejo.id;
                        option.textContent = complejo.nombre;
                        select.appendChild(option);
                    });
                    
                    console.log(`✅ ${complejosUnicos.length} complejos únicos cargados en filtros`);
                }
            }
        } catch (error) {
            console.error('Error cargando complejos:', error);
        }
    }

    handleTimeRangeChange(value) {
        const customDateRange = document.getElementById('customDateRange');
        if (value === 'custom') {
            customDateRange.style.display = 'block';
            this.setDefaultCustomDates();
        } else {
            customDateRange.style.display = 'none';
            this.currentFilters.timeRange = value;
        }
    }

    setDefaultCustomDates() {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        document.getElementById('dateFromFilter').value = thirtyDaysAgo.toISOString().split('T')[0];
        document.getElementById('dateToFilter').value = today.toISOString().split('T')[0];
    }

    async applyFilters() {
        // Mostrar indicador de carga
        this.showLoadingState();

        try {
            // Recopilar valores de los filtros
            const timeRange = document.getElementById('timeRangeFilter').value;
            const complexFilter = document.getElementById('complexFilter').value;
            const sportFilter = document.getElementById('sportFilter').value;
            
            let dateFrom, dateTo;
            
            if (timeRange === 'custom') {
                dateFrom = document.getElementById('dateFromFilter').value;
                dateTo = document.getElementById('dateToFilter').value;
            } else {
                const days = parseInt(timeRange);
                const today = new Date();
                const startDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
                
                dateFrom = startDate.toISOString().split('T')[0];
                dateTo = today.toISOString().split('T')[0];
            }

            // Actualizar filtros actuales
            this.currentFilters = {
                timeRange,
                complexFilter,
                sportFilter,
                dateFrom,
                dateTo
            };

            // Aplicar filtros al gráfico principal de reservas
            await this.updateReservationsChart();
            
            // Actualizar otros gráficos si existen
            if (typeof window.updateTypesChart === 'function') {
                await this.updateTypesChart();
            }
            if (typeof window.updateHoursChart === 'function') {
                await this.updateHoursChart();
            }

            // Mostrar notificación de éxito
            if (notificationSystem) {
                notificationSystem.notifySystemAlert({
                    type: 'success',
                    message: 'Filtros aplicados correctamente'
                });
            }

        } catch (error) {
            console.error('Error aplicando filtros:', error);
            if (notificationSystem) {
                notificationSystem.notifySystemAlert({
                    type: 'error',
                    message: 'Error al aplicar filtros'
                });
            }
        } finally {
            this.hideLoadingState();
        }
    }

    resetFilters() {
        // Restaurar valores por defecto
        document.getElementById('timeRangeFilter').value = '7';
        document.getElementById('complexFilter').value = 'all';
        document.getElementById('sportFilter').value = 'all';
        document.getElementById('customDateRange').style.display = 'none';

        // Aplicar filtros por defecto
        this.currentFilters = {
            timeRange: '7',
            complexFilter: 'all',
            sportFilter: 'all',
            dateFrom: null,
            dateTo: null
        };

        this.applyFilters();
    }

    async updateReservationsChart() {
        try {
            console.log('🔄 Actualizando gráfico de reservas con filtros:', this.currentFilters);
            
            const response = await AdminUtils.authenticatedFetch(`${API_BASE}/admin/reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dateFrom: this.currentFilters.dateFrom,
                    dateTo: this.currentFilters.dateTo,
                    complexId: this.currentFilters.complexFilter === 'all' ? null : this.currentFilters.complexFilter,
                    sportType: this.currentFilters.sportFilter === 'all' ? null : this.currentFilters.sportFilter
                })
            });

            if (response && response.ok) {
                const data = await response.json();
                console.log('📊 Datos recibidos del servidor:', data);
                
                if (data.charts && data.charts.reservasPorDia && window.reservationsChart) {
                    console.log('✅ Actualizando gráfico con datos:', data.charts.reservasPorDia);
                    this.updateChartData(window.reservationsChart, data.charts.reservasPorDia);
                    
                    // Actualizar título del gráfico
                    if (typeof window.actualizarTituloGrafico === 'function') {
                        window.actualizarTituloGrafico();
                    }
                } else {
                    console.log('⚠️ No se encontraron datos válidos para actualizar el gráfico');
                    console.log('Datos recibidos:', data);
                    console.log('Gráfico disponible:', !!window.reservationsChart);
                }
            } else {
                console.error('❌ Error en la respuesta del servidor:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('❌ Error actualizando gráfico de reservas:', error);
        }
    }

    async updateTypesChart() {
        try {
            const response = await AdminUtils.authenticatedFetch(`${API_BASE}/admin/reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dateFrom: this.currentFilters.dateFrom,
                    dateTo: this.currentFilters.dateTo,
                    complexId: this.currentFilters.complexFilter === 'all' ? null : this.currentFilters.complexFilter,
                    sportType: this.currentFilters.sportFilter === 'all' ? null : this.currentFilters.sportFilter
                })
            });

            if (response && response.ok) {
                const data = await response.json();
                if (data.charts && data.charts.reservasPorTipo && typeChart) {
                    this.updateChartData(typeChart, data.charts.reservasPorTipo);
                }
            }
        } catch (error) {
            console.error('Error actualizando gráfico de tipos:', error);
        }
    }

    async updateHoursChart() {
        try {
            const response = await AdminUtils.authenticatedFetch(`${API_BASE}/admin/reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dateFrom: this.currentFilters.dateFrom,
                    dateTo: this.currentFilters.dateTo,
                    complexId: this.currentFilters.complexFilter === 'all' ? null : this.currentFilters.complexFilter,
                    sportType: this.currentFilters.sportFilter === 'all' ? null : this.currentFilters.sportFilter
                })
            });

            if (response && response.ok) {
                const data = await response.json();
                if (data.charts && data.charts.horariosPopulares && hoursChart) {
                    this.updateChartData(hoursChart, data.charts.horariosPopulares);
                }
            }
        } catch (error) {
            console.error('Error actualizando gráfico de horarios:', error);
        }
    }

    updateChartData(chart, data) {
        if (!chart || !data) return;

        // Actualizar datos según el tipo de gráfico
        if (chart.config.type === 'line' || chart.config.type === 'bar') {
            // Gráfico de líneas o barras
            const labels = data.map(item => {
                if (item.dia) {
                    return this.formatDate(item.dia);
                } else if (item.hora) {
                    return item.hora;
                }
                return item.label || item.name;
            });
            
            const values = data.map(item => parseInt(item.cantidad || item.value || 0));
            
            chart.data.labels = labels;
            chart.data.datasets[0].data = values;
        } else if (chart.config.type === 'doughnut') {
            // Gráfico de dona
            const labels = data.map(item => item.tipo || item.name);
            const values = data.map(item => parseInt(item.cantidad || item.value || 0));
            
            chart.data.labels = labels;
            chart.data.datasets[0].data = values;
        }

        chart.update('active');
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-CL', {
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    showLoadingState() {
        const applyBtn = document.querySelector('[onclick="chartFilters.applyFilters()"]');
        if (applyBtn) {
            applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aplicando...';
            applyBtn.disabled = true;
        }
    }

    hideLoadingState() {
        const applyBtn = document.querySelector('[onclick="chartFilters.applyFilters()"]');
        if (applyBtn) {
            applyBtn.innerHTML = '<i class="fas fa-filter"></i> Aplicar';
            applyBtn.disabled = false;
        }
    }

    loadInitialData() {
        // Cargar datos iniciales con filtros por defecto
        setTimeout(() => {
            this.applyFilters();
        }, 1000);
    }

    // Método para obtener filtros actuales (útil para otros componentes)
    getCurrentFilters() {
        return { ...this.currentFilters };
    }

    // Método para obtener parámetros de filtros en formato específico
    getFilterParams() {
        const timeRange = this.currentFilters.timeRange;
        let periodo = '7d';
        
        switch(timeRange) {
            case '7':
                periodo = '7d';
                break;
            case '30':
                periodo = '30d';
                break;
            case '90':
                periodo = '3m';
                break;
            case 'custom':
                periodo = 'custom';
                break;
        }
        
        return {
            periodo: periodo,
            complejo: this.currentFilters.complexFilter,
            deporte: this.currentFilters.sportFilter,
            fechaInicio: this.currentFilters.dateFrom,
            fechaFin: this.currentFilters.dateTo,
            complejoNombre: this.getComplexName(this.currentFilters.complexFilter)
        };
    }

    getComplexName(complexId) {
        if (complexId === 'all') return null;
        
        const complexSelect = document.getElementById('complexFilter');
        if (complexSelect) {
            const selectedOption = complexSelect.querySelector(`option[value="${complexId}"]`);
            return selectedOption ? selectedOption.textContent : null;
        }
        return null;
    }

    // Método para exportar datos filtrados
    exportFilteredData() {
        const filters = this.getCurrentFilters();
        const exportData = {
            filters: filters,
            timestamp: new Date().toISOString(),
            data: {
                reservations: reservationsChart ? reservationsChart.data : null,
                types: typeChart ? typeChart.data : null,
                hours: hoursChart ? hoursChart.data : null
            }
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `datos-filtrados-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);

        if (notificationSystem) {
            notificationSystem.notifySystemAlert({
                type: 'success',
                message: 'Datos filtrados exportados correctamente'
            });
        }
    }
}

// Inicializar sistema de filtros
let chartFilters;

document.addEventListener('DOMContentLoaded', function() {
    if (typeof AdminUtils !== 'undefined') {
        chartFilters = new ChartFilters();
    }
});
