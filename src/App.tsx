import React, { useState, useMemo } from 'react';
import { ChevronDown, Award, Sparkles, Brain, BarChart3, Clock, Calendar, Hash, FileSpreadsheet, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseCsvFile, LotteryResult, getTrendLineAndPrediction, dayOfWeekMap, generateMockPredictions, padToN } from './utils';
import { parse, isValid } from 'date-fns';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Configuración de Loterías
const LOTTERIES = [
  { name: 'Astro Luna', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/astroluna.csv' },
  { name: 'Cundinamarca', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/cundinamarca.csv' },
  { name: 'Valle', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/valle.csv' },
  { name: 'Bogotá', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/bogota.csv' },
  { name: 'Antioqueñitas', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/ants.csv' },
  { name: 'Astrosol', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/astrosol.csv' },
  { name: 'Boyacá', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/boyaca.csv' },
  { name: 'Cafetero noche', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/cafeteron.csv' },
  { name: 'Cash día', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/cashd.csv' },
  { name: 'Cash noche', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/cashn.csv' },
  { name: 'Cash día y noche', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/cashdn.csv' },
  { name: 'Chontico noche', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/chonn.csv' },
  { name: 'Cruz roja', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/cruzroja.csv' },
  { name: 'Medellín', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/medellin.csv' },
  { name: 'Paisas', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/paisas123.csv' },
  { name: 'Pijao', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/pijao.csv' },
  { name: 'Play día', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/playd.csv' },
  { name: 'Play noche', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/playn.csv' },
  { name: 'Play día y noche', url: 'https://raw.githubusercontent.com/JJJARAMILLOH/Information/master/playdn.csv' }
  
];

// Custom Tooltip for charts
const CustomTooltip = ({ active, payload, label, digits = 4 }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl">
        <p className="text-slate-300 text-sm mb-1">{label}</p>
        <p className="text-white font-mono font-bold">
          Resultado : {padToN(payload[0].value, digits)}
        </p>
        {payload[1] && (
            <p className="text-pink-400 font-mono text-xs mt-1">
              Tendencia : {payload[1].value.toFixed(2)}
            </p>
        )}
      </div>
    );
  }
  return null;
};

export default function App() {
  const [data, setData] = useState<LotteryResult[]>([]);
  const [digits, setDigits] = useState<number>(4);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLottery, setSelectedLottery] = useState<string>('');
  
  // Filters
  const [terminationFilter, setTerminationFilter] = useState('534');
  const [dateFilter, setDateFilter] = useState('06-10'); 
  const [dayFilter, setDayFilter] = useState('Miércoles'); 

  const loadLotteryData = async (url: string, name: string) => {
    setIsLoading(true);
    setSelectedLottery(name);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const text = await response.text();
      const file = new File([text], `${name}.csv`, { type: 'text/csv' });
      
      parseCsvFile(file, (parsed, detectedDigits) => {
        setDigits(detectedDigits);
        setData(parsed);
        setIsLoading(false);
      });
    } catch (error) {
      console.error("Error cargando los datos de la lotería:", error);
      setIsLoading(false);
      alert("Hubo un error al intentar descargar el historial de esta lotería.");
    }
  };

  const hasData = data.length > 0;

  // 1. Top Histórico
  const topHistorico = useMemo(() => {
    if (!hasData) return [];
    const counts: Record<string, number> = {};
    data.forEach(item => {
        counts[item.result] = (counts[item.result] || 0) + 1;
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([numero, apariciones]) => ({ numero, apariciones }));
  }, [data, hasData]);

  // 2. Últimos 100 Resultados
  const ultimos100 = useMemo(() => {
    if (!hasData) return { chartData: [], prediction: 0 };
    const last100 = data.slice(-100);
    const numericData = last100.map(d => parseInt(d.result, 10));
    const { trendLine, prediction } = getTrendLineAndPrediction(numericData, digits);
    
    return {
        chartData: last100.map((d, i) => ({
            name: d.date,
            value: parseInt(d.result, 10),
            trend: trendLine[i]
        })),
        prediction: Math.round(prediction)
    };
  }, [data, digits, hasData]);

  // 3. Eventos para Fecha Exacta (MM-DD)
  const eventosFecha = useMemo(() => {
    if (!hasData || !dateFilter || dateFilter.length < 5) return { table: [], chartData: [], prediction: 0 };
    
    const filtered = data.filter(d => d.date.includes(dateFilter));
    const numericData = filtered.map(d => parseInt(d.result, 10));
    const { trendLine, prediction } = getTrendLineAndPrediction(numericData, digits);
    
    return {
        table: filtered.slice(-5).reverse(), 
        chartData: filtered.map((d, i) => ({
            name: d.date,
            value: parseInt(d.result, 10),
            trend: trendLine[i]
        })),
        prediction: Math.round(prediction)
    };
  }, [data, dateFilter, digits, hasData]);

  // 4. Resultados para Día de la Semana
  const eventosDia = useMemo(() => {
    if (!hasData || !dayFilter) return { table: [], chartData: [], prediction: 0 };
    
    const targetDay = dayOfWeekMap[dayFilter];
    const filtered = data.filter(d => {
        const parsedDate = parse(d.date, 'yyyy-MM-dd', new Date());
        return isValid(parsedDate) && parsedDate.getDay() === targetDay;
    });
    
    const last100 = filtered.slice(-100);
    const numericData = last100.map(d => parseInt(d.result, 10));
    const { trendLine, prediction } = getTrendLineAndPrediction(numericData, digits);

    return {
        table: filtered.slice(-5).reverse(),
        chartData: last100.map((d, i) => ({
            name: d.date,
            value: parseInt(d.result, 10),
            trend: trendLine[i]
        })),
        prediction: Math.round(prediction)
    };
  }, [data, dayFilter, digits, hasData]);

  // 5. Eventos para Terminación (3 Cifras)
  const eventosTerminacion = useMemo(() => {
    if (!hasData || !terminationFilter || terminationFilter.length !== 3) return { table: [], chartData: [], prediction: 0, hasData: false };
    
    const filtered = [];
    for (let i = 0; i < data.length - 1; i++) {
        if (data[i].result.endsWith(terminationFilter)) {
            filtered.push(data[i+1]);
        }
    }

    const numericData = filtered.map(d => parseInt(d.result, 10));
    const { trendLine, prediction } = getTrendLineAndPrediction(numericData, digits);
    
    return {
        hasData: filtered.length > 0,
        table: filtered.slice(-5).reverse(),
        chartData: filtered.map((d, i) => ({
            name: d.date,
            value: parseInt(d.result, 10),
            trend: trendLine[i]
        })),
        prediction: Math.round(prediction)
    };
  }, [data, terminationFilter, digits, hasData]);

  // AI Models
  const aiPredictions = useMemo(() => {
     if (!hasData) return [];
     let preds = generateMockPredictions(data[data.length-1].result, digits);
     preds.sort((a, b) => parseFloat(b.conf) - parseFloat(a.conf));
     return preds;
  }, [data, digits, hasData]);

  return (
    <div className="flex h-screen bg-[#060B14] text-slate-300 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-[#0B1221] border-r border-slate-800 flex flex-col h-full z-10 shadow-2xl flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 text-pink-500 font-bold text-xl tracking-wider">
            <Sparkles className="w-5 h-5" />
            LOTTOPRO
          </div>
          <p className="text-xs text-slate-500 mt-2 leading-tight">Motor Avanzado de Predicción y Análisis</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-8">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Seleccionar Lotería</h3>
            
            {/* Lista Desplegable en Sidebar */}
            <div className="relative">
              <select
                value={selectedLottery}
                onChange={(e) => {
                  const selected = LOTTERIES.find(l => l.name === e.target.value);
                  if (selected) {
                    loadLotteryData(selected.url, selected.name);
                  }
                }}
                disabled={isLoading}
                className="w-full bg-[#131C2F] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500 appearance-none transition-colors disabled:opacity-50 cursor-pointer"
              >
                <option value="" disabled>-- Seleccionar Lotería --</option>
                {LOTTERIES.map((lottery) => (
                  <option key={lottery.name} value={lottery.name} className="bg-[#0B1221] text-white">
                    {lottery.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
                {isLoading && (
                  <span className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></span>
                )}
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            <p className="text-xs mt-4 font-medium flex items-center gap-2">
              {hasData ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-emerald-400">{data.length} registros cargados ({digits} cifras)</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                  <span className="text-slate-500">Sin datos cargados</span>
                </>
              )}
            </p>
          </div>

          <div className={cn("transition-opacity duration-300", hasData ? "opacity-100" : "opacity-50 pointer-events-none")}>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Filtros de Análisis</h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    Terminación (3 cifras)
                </label>
                <input 
                    type="text" 
                    maxLength={3}
                    placeholder="Ej. 123"
                    value={terminationFilter}
                    onChange={(e) => setTerminationFilter(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#131C2F] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Fecha Exacta (MM-DD)
                </label>
                <input 
                    type="text" 
                    placeholder="Ej. 06-10"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full bg-[#131C2F] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Día de la Semana
                </label>
                <div className="relative">
                  <select 
                      value={dayFilter}
                      onChange={(e) => setDayFilter(e.target.value)}
                      className="w-full bg-[#131C2F] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 appearance-none transition-colors cursor-pointer"
                  >
                    {Object.keys(dayOfWeekMap).map(day => (
                        <option key={day} value={day} className="bg-[#0B1221] text-white">{day}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {!hasData ? (
          <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
            <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-slate-700/50">
               <Database className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Bienvenido a LottoPro</h2>
            <p className="text-slate-400 max-w-md mx-auto mb-8">
              Para comenzar con el análisis algorítmico, selecciona una de las loterías disponibles en la lista desplegable. El sistema descargará automáticamente el historial en tiempo real.
            </p>
            
            {/* Lista Desplegable en Pantalla de Bienvenida */}
            <div className="relative max-w-md w-full mx-auto">
              <select
                value={selectedLottery}
                onChange={(e) => {
                  const selected = LOTTERIES.find(l => l.name === e.target.value);
                  if (selected) {
                    loadLotteryData(selected.url, selected.name);
                  }
                }}
                disabled={isLoading}
                className="w-full bg-[#0F172A] border border-slate-700 hover:border-pink-500/50 rounded-xl px-5 py-3.5 text-sm text-slate-200 font-medium focus:outline-none focus:border-pink-500 appearance-none transition-all cursor-pointer shadow-xl"
              >
                <option value="" disabled>Elige una lotería para iniciar...</option>
                {LOTTERIES.map((lottery) => (
                  <option key={`main-${lottery.name}`} value={lottery.name} className="bg-[#0F172A] text-white">
                    {lottery.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
                {isLoading && (
                  <span className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></span>
                )}
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            
            {/* ROW 1: Top Histórico & Últimos 100 */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <Card className="lg:col-span-1" title="Top Histórico (Frecuencia)" icon={<BarChart3 className="w-4 h-4" />}>
                 <table className="w-full text-sm mt-2">
                   <thead>
                     <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800">
                       <th className="pb-3 font-semibold">Número</th>
                       <th className="pb-3 font-semibold text-right">Apariciones</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800/50">
                     {topHistorico.map((row, i) => (
                       <tr key={i} className="group hover:bg-slate-800/30 transition-colors">
                         <td className="py-3 font-mono text-white font-medium flex items-center gap-2">
                           <span className="text-slate-500 text-xs w-3">{i+1}</span>
                           {row.numero}
                         </td>
                         <td className="py-3 text-right text-slate-400">{row.apariciones}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </Card>

              <Card className="lg:col-span-3" title="Últimos 100 Resultados y Tendencia" icon={<BarChart3 className="w-4 h-4" />}
                  action={<Badge>Tendencia Sugerida: {padToN(ultimos100.prediction, digits)}</Badge>}
              >
                <div className="h-64 mt-4 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ultimos100.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={10} tickMargin={10} minTickGap={30} />
                      <YAxis stroke="#475569" fontSize={10} domain={[0, digits === 3 ? 999 : 9999]} tickFormatter={(v) => padToN(v, digits)} />
                      <Tooltip content={<CustomTooltip digits={digits} />} />
                      <Line type="monotone" dataKey="value" stroke="#06B6D4" strokeWidth={1.5} dot={{ r: 2, fill: '#06B6D4', strokeWidth: 0 }} activeDot={{ r: 4, fill: '#fff' }} label={{ position: 'top', fill: '#cbd5e1', fontSize: 10 }} />
                      <Line type="linear" dataKey="trend" stroke="#F43F5E" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* ROW 2: Eventos MM-DD */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <Card className="lg:col-span-1" title={`Eventos para ${dateFilter}`} icon={<Calendar className="w-4 h-4" />}>
                 <table className="w-full text-sm mt-2">
                   <thead>
                     <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800">
                       <th className="pb-3 font-semibold">Fecha</th>
                       <th className="pb-3 font-semibold text-right">Resultado</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800/50">
                     {eventosFecha.table.length > 0 ? eventosFecha.table.map((row, i) => (
                       <tr key={i} className="group hover:bg-slate-800/30 transition-colors">
                         <td className="py-3 text-slate-400 text-xs">{row.date}</td>
                         <td className="py-3 text-right font-mono text-pink-500 font-bold">{row.result}</td>
                       </tr>
                     )) : (
                       <tr><td colSpan={2} className="py-6 text-center text-slate-500 text-xs">Sin coincidencias</td></tr>
                     )}
                   </tbody>
                 </table>
              </Card>

              <Card className="lg:col-span-3" title={`Evolución y Tendencia para ${dateFilter}`} icon={<BarChart3 className="w-4 h-4" />}
                  action={<Badge color="pink">Predicción Tendencia: {padToN(eventosFecha.prediction, digits)}</Badge>}
              >
                <div className="h-64 mt-4 w-full">
                  {eventosFecha.chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={eventosFecha.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                        <XAxis dataKey="name" stroke="#475569" fontSize={10} tickMargin={10} />
                        <YAxis stroke="#475569" fontSize={10} domain={[0, digits === 3 ? 999 : 9999]} tickFormatter={(v) => padToN(v, digits)} />
                        <Tooltip content={<CustomTooltip digits={digits} />} />
                        <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4, fill: '#1E1B4B', stroke: '#3B82F6', strokeWidth: 2 }} activeDot={{ r: 6 }} label={{ position: 'top', fill: '#cbd5e1', fontSize: 10 }} />
                        <Line type="linear" dataKey="trend" stroke="#F43F5E" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 text-sm">No hay suficientes datos para {dateFilter}</div>
                  )}
                </div>
              </Card>
            </div>

            {/* ROW 3: Eventos Día */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <Card className="lg:col-span-1" title={`Resultados para ${dayFilter}`} icon={<Calendar className="w-4 h-4" />}>
                 <table className="w-full text-sm mt-2">
                   <thead>
                     <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800">
                       <th className="pb-3 font-semibold">Fecha</th>
                       <th className="pb-3 font-semibold text-right">Resultado</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800/50">
                     {eventosDia.table.length > 0 ? eventosDia.table.map((row, i) => (
                       <tr key={i} className="group hover:bg-slate-800/30 transition-colors">
                         <td className="py-3 text-slate-400 text-xs">{row.date}</td>
                         <td className="py-3 text-right font-mono text-emerald-400 font-bold">{row.result}</td>
                       </tr>
                     )) : (
                        <tr><td colSpan={2} className="py-6 text-center text-slate-500 text-xs">Sin coincidencias</td></tr>
                     )}
                   </tbody>
                 </table>
              </Card>

              <Card className="lg:col-span-3" title={`Últimos 100 ${dayFilter} y Tendencia`} icon={<BarChart3 className="w-4 h-4" />}
                  action={<Badge color="emerald">Sug. Día: {padToN(eventosDia.prediction, digits)}</Badge>}
              >
                <div className="h-64 mt-4 w-full">
                  {eventosDia.chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={eventosDia.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                        <XAxis dataKey="name" stroke="#475569" fontSize={10} tickMargin={10} minTickGap={30} />
                        <YAxis stroke="#475569" fontSize={10} domain={[0, digits === 3 ? 999 : 9999]} tickFormatter={(v) => padToN(v, digits)} />
                        <Tooltip content={<CustomTooltip digits={digits} />} />
                        <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={1.5} dot={{ r: 2, fill: '#10B981', strokeWidth: 0 }} activeDot={{ r: 4, fill: '#fff' }} label={{ position: 'top', fill: '#cbd5e1', fontSize: 10 }} />
                        <Line type="linear" dataKey="trend" stroke="#F43F5E" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 text-sm">No hay suficientes datos para {dayFilter}</div>
                  )}
                </div>
              </Card>
            </div>
            
            {/* ROW FIX: Eventos Terminación */}
            {eventosTerminacion.hasData && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="lg:col-span-1" title={`Después de la term: ${terminationFilter}`} icon={<Hash className="w-4 h-4" />}>
                     <table className="w-full text-sm mt-2">
                       <thead>
                         <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800">
                           <th className="pb-3 font-semibold">Fecha</th>
                           <th className="pb-3 font-semibold text-right">Resultado</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-800/50">
                         {eventosTerminacion.table.length > 0 ? eventosTerminacion.table.map((row, i) => (
                           <tr key={i} className="group hover:bg-slate-800/30 transition-colors">
                             <td className="py-3 text-slate-400 text-xs">{row.date}</td>
                             <td className="py-3 text-right font-mono text-amber-400 font-bold">{row.result}</td>
                           </tr>
                         )) : (
                             <tr><td colSpan={2} className="py-8 text-center text-slate-500 text-xs">No hay resultados posteriores a la terminación {terminationFilter}</td></tr>
                         )}
                       </tbody>
                     </table>
                  </Card>
      
                  <Card className="lg:col-span-3" title={`Evolución y Tendencia de números posteriores a la Term. ${terminationFilter}`} icon={<BarChart3 className="w-4 h-4" />}
                      action={<Badge color="amber">Sug. Terminación: {padToN(eventosTerminacion.prediction, digits)}</Badge>}
                  >
                    <div className="h-64 mt-4 w-full">
                      {eventosTerminacion.chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={eventosTerminacion.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                              <XAxis dataKey="name" stroke="#475569" fontSize={10} tickMargin={10} minTickGap={30} />
                              <YAxis stroke="#475569" fontSize={10} domain={[0, digits === 3 ? 999 : 9999]} tickFormatter={(v) => padToN(v, digits)} />
                              <Tooltip content={<CustomTooltip digits={digits} />} />
                              <Line type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={1.5} dot={{ r: 3, fill: '#1E1B4B', stroke: '#F59E0B', strokeWidth: 1.5 }} activeDot={{ r: 5 }} label={{ position: 'top', fill: '#cbd5e1', fontSize: 10 }} />
                              <Line type="linear" dataKey="trend" stroke="#F43F5E" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                      ) : (
                          <div className="h-full flex items-center justify-center text-slate-600">Insuficientes datos</div>
                      )}
                    </div>
                  </Card>
                </div>
            )}

            {/* AI MODELS SECTION */}
            {aiPredictions.length > 0 && (
              <div className="pt-6">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Análisis con Modelos de IA Avanzados</h2>
                        <p className="text-xs text-slate-400">Evaluación algorítmica de probabilidades y predicción predictiva.</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2" title="Rendimiento y Predicciones por Modelo" icon={<Award className="w-4 h-4" />}>
                       <table className="w-full text-sm mt-4">
                         <thead>
                           <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800">
                             <th className="pb-3 font-semibold">Modelo IA</th>
                             <th className="pb-3 font-semibold text-center">Predicción</th>
                             <th className="pb-3 font-semibold text-right">Confianza</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800/50">
                           {aiPredictions.map((row, i) => (
                             <tr key={i} className="group hover:bg-slate-800/30 transition-colors">
                               <td className="py-3.5 text-slate-200 font-medium text-xs">{row.model}</td>
                               <td className="py-3.5 text-center">
                                   <span className="bg-[#1A2235] border border-slate-700 px-3 py-1 rounded text-indigo-300 font-mono text-xs shadow-sm">
                                       {row.prediction}
                                   </span>
                               </td>
                               <td className="py-3.5 text-right flex items-center justify-end gap-3">
                                   <span className="text-emerald-400 font-mono text-xs font-semibold">{row.conf}</span>
                                   <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                       <div className="h-full bg-emerald-500" style={{ width: row.conf }}></div>
                                   </div>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                    </Card>
                    
                    <Card className="lg:col-span-1 border-indigo-500/30 bg-gradient-to-b from-[#0F172A] to-[#0A0F1A]" title="" headerless>
                        <div className="flex flex-col items-center justify-center p-4">
                            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-3">
                               <Award className="w-6 h-6 text-amber-400" />
                            </div>
                            <h3 className="text-base font-bold text-white">Sistema Profesional</h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Multi-Confluencia Top 3</p>
                            
                            <div className="w-full mt-8 space-y-4">
                                {/* ORO */}
                                <div className="bg-[#131C2F] border border-slate-700/50 p-4 rounded-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-full -z-10 group-hover:bg-amber-500/10 transition-colors"></div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                                <span className="text-xs font-bold text-amber-400"># ORO</span>
                                            </div>
                                            <div className="text-3xl font-mono font-bold text-white">{aiPredictions[0]?.prediction}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-amber-400 font-mono font-bold text-lg">{aiPredictions[0]?.conf}</div>
                                            <div className="text-[10px] text-slate-500">Probabilidad</div>
                                        </div>
                                    </div>
                                </div>

                                {/* PLATA */}
                                <div className="bg-[#131C2F] border border-slate-700/50 p-4 rounded-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-slate-400/5 rounded-bl-full -z-10 group-hover:bg-slate-400/10 transition-colors"></div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                                <span className="text-xs font-bold text-slate-300"># PLATA</span>
                                            </div>
                                            <div className="text-3xl font-mono font-bold text-white">{aiPredictions[1]?.prediction}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-slate-300 font-mono font-bold text-lg">{aiPredictions[1]?.conf}</div>
                                            <div className="text-[10px] text-slate-500">Probabilidad</div>
                                        </div>
                                    </div>
                                </div>

                                {/* BRONCE */}
                                <div className="bg-[#131C2F] border border-slate-700/50 p-4 rounded-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-orange-700/5 rounded-bl-full -z-10 group-hover:bg-orange-700/10 transition-colors"></div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="w-2 h-2 rounded-full bg-orange-600"></span>
                                                <span className="text-xs font-bold text-orange-600"># BRONCE</span>
                                            </div>
                                            <div className="text-3xl font-mono font-bold text-white">{aiPredictions[2]?.prediction}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-orange-600 font-mono font-bold text-lg">{aiPredictions[2]?.conf}</div>
                                            <div className="text-[10px] text-slate-500">Probabilidad</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                 </div>
              </div>
            )}
            
            <div className="h-8"></div>
          </div>
        )}
      </main>
    </div>
  );
}

// UI Components

function Card({ 
    title, 
    children, 
    className, 
    icon, 
    action,
    headerless = false
}: { 
    title?: string, 
    children: React.ReactNode, 
    className?: string, 
    icon?: React.ReactNode,
    action?: React.ReactNode,
    headerless?: boolean
}) {
  return (
    <div className={cn("bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col", className)}>
      {!headerless && (
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                {icon && <span className="text-indigo-400">{icon}</span>}
                {title}
            </h2>
            {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}

function Badge({ children, color = 'indigo' }: { children: React.ReactNode, color?: 'indigo' | 'pink' | 'emerald' | 'amber' }) {
    const colors = {
        indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
        emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    };
    
    return (
        <span className={cn("text-xs px-2.5 py-1 rounded-full border font-mono font-medium flex items-center gap-1.5", colors[color])}>
            <div className={cn("w-1.5 h-1.5 rounded-full", color === 'indigo' ? 'bg-indigo-400' : color === 'pink' ? 'bg-pink-400' : color === 'emerald' ? 'bg-emerald-400' : 'bg-amber-400')}></div>
            {children}
        </span>
    );
}