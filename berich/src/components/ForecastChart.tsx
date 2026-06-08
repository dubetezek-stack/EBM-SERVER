import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

interface ForecastChartProps {
  forecast: {
    months: string[];
    grandTotal: {
      general: number[];
      installments: number[];
      categories: Record<string, number[]>;
    };
  };
}

const CATEGORY_COLORS = [
  '#FF3366', // Rosa forte
  '#20E2D7', // Ciano brilhante
  '#F6D365', // Amarelo
  '#A18CD1', // Roxo suave
  '#FF9A9E', // Salmão
  '#84FAB0', // Verde menta
  '#4FACFE', // Azul brilhante
  '#FA709A', // Rosa quente
  '#E0C3FC', // Lilás
  '#FEE140', // Amarelo vibrante
  '#3B82F6', // Azul Tailwind
  '#10B981', // Verde Tailwind
  '#F59E0B', // Laranja Tailwind
  '#8B5CF6', // Roxo Tailwind
  '#EC4899', // Pink Tailwind
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // Find the total payload
    const totalPayload = payload.find((p: any) => p.dataKey === 'Total Geral');
    
    // Filter out total for the breakdown and sort by value (descending)
    const breakdown = payload
      .filter((p: any) => p.dataKey !== 'Total Geral' && p.value > 0.01)
      .sort((a: any, b: any) => b.value - a.value);

    return (
      <div style={{
        background: 'rgba(20, 20, 30, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        minWidth: '220px'
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
          {label}
        </h3>
        
        {totalPayload && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontWeight: 'bold' }}>
            <span style={{ color: '#3B82F6' }}>TOTAL</span>
            <span style={{ color: 'white' }}>R$ {totalPayload.value.toFixed(2)}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {breakdown.map((entry: any, index: number) => (
            <div key={`item-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: entry.color }} />
                <span style={{ color: 'var(--text-secondary)' }}>{entry.name}</span>
              </div>
              <span style={{ color: 'white', fontWeight: 500 }}>R$ {entry.value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function ForecastChart({ forecast }: ForecastChartProps) {
  const chartData = useMemo(() => {
    if (!forecast || !forecast.months) return [];
    
    return forecast.months.map((month, index) => {
      const dataPoint: any = {
        name: month,
        'Total Geral': forecast.grandTotal.general[index],
      };

      // Adiciona cada categoria no datapoint
      Object.entries(forecast.grandTotal.categories).forEach(([category, values]) => {
        // Apenas inclui a categoria se o valor for positivo e significativo
        const val = values[index];
        if (val > 0.01) {
          dataPoint[category] = val;
        }
      });

      return dataPoint;
    });
  }, [forecast]);

  // Extrair todas as categorias únicas que possuem algum valor > 0 em qualquer mês
  const activeCategories = useMemo(() => {
    if (!forecast) return [];
    
    const categories = Object.keys(forecast.grandTotal.categories).filter(cat => {
      return forecast.grandTotal.categories[cat].some(val => val > 0.01);
    });
    
    // Sort so largest categories overall get the first colors
    return categories.sort((a, b) => {
      const sumA = forecast.grandTotal.categories[a].reduce((acc, v) => acc + v, 0);
      const sumB = forecast.grandTotal.categories[b].reduce((acc, v) => acc + v, 0);
      return sumB - sumA;
    });
  }, [forecast]);

  if (chartData.length === 0) return null;

  return (
    <div style={{ width: '100%', height: '400px', marginTop: '16px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 20, left: -10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          
          <XAxis 
            dataKey="name" 
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          
          <YAxis 
            tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `R$${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
          />
          
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
          />
          
          <Legend 
            wrapperStyle={{ paddingTop: '20px', fontSize: '0.85rem' }}
            iconType="circle"
          />

          {/* Barras empilhadas para as categorias */}
          {activeCategories.map((category, index) => (
            <Bar 
              key={category}
              dataKey={category} 
              stackId="a" 
              fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} 
              radius={
                // Se for a última categoria (topo da pilha), arredondar o topo
                index === activeCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
              }
              maxBarSize={50}
            />
          ))}

          {/* Linha de Tendência do Total */}
          <Line 
            type="monotone" 
            dataKey="Total Geral" 
            stroke="#3B82F6" 
            strokeWidth={3}
            dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: 'var(--bg-primary)' }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
