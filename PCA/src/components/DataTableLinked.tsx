import React, { useState, useMemo } from 'react';
import { Download, Search, Filter } from 'lucide-react';
import Papa from 'papaparse';
import { PCAResult, DBSCANResult, ThemeMode } from '../types/pca';

interface DataTableLinkedProps {
  pcaResult: PCAResult;
  dbscanResult: DBSCANResult | null;
  datasetName: string;
  theme?: ThemeMode;
}

export const DataTableLinked: React.FC<DataTableLinkedProps> = ({
  pcaResult,
  dbscanResult,
  datasetName,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [clusterFilter, setClusterFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const pageSize = 15;

  // Build combined table rows
  const tableRows = useMemo(() => {
    return pcaResult.transformedData.map((pt, i) => {
      const clusterId = dbscanResult?.labels[i] ?? -1;
      const clusterObj = dbscanResult?.clusterStats.find(c => c.id === clusterId);
      const clusterName = clusterId === -1 ? 'Noise' : (clusterObj?.name || `Cluster ${clusterId + 1}`);

      return {
        id: pt.id,
        label: pt.label,
        clusterId,
        clusterName,
        pc1: pt.pc1.toFixed(3),
        pc2: pt.pc2.toFixed(3),
        pc3: pt.pc3.toFixed(3),
        original: pcaResult.rawMatrix[i] || []
      };
    });
  }, [pcaResult, dbscanResult]);

  // Filter rows
  const filteredRows = useMemo(() => {
    return tableRows.filter(r => {
      const matchSearch =
        String(r.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(r.label).toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.clusterName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCluster =
        clusterFilter === 'all' ||
        (clusterFilter === 'noise' && r.clusterId === -1) ||
        String(r.clusterId) === clusterFilter;

      return matchSearch && matchCluster;
    });
  }, [tableRows, searchTerm, clusterFilter]);

  const pageCount = Math.ceil(filteredRows.length / pageSize);
  const pagedRows = filteredRows.slice(page * pageSize, (page + 1) * pageSize);

  const handleExportCSV = () => {
    const exportData = filteredRows.map(r => ({
      Sample_ID: r.id,
      Label: r.label,
      DBSCAN_Cluster: r.clusterName,
      PC1: r.pc1,
      PC2: r.pc2,
      PC3: r.pc3,
      ...pcaResult.featureNames.reduce((acc, f, idx) => {
        acc[f] = r.original[idx] ?? '';
        return acc;
      }, {} as Record<string, any>)
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${datasetName.toLowerCase().replace(/\s+/g, '_')}_pca_projected.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{
      background: isDark ? 'var(--bg-card)' : '#ffffff',
      borderRadius: 14,
      border: `1px solid ${isDark ? 'var(--border-card)' : '#e2e8f0'}`,
      boxShadow: isDark ? 'var(--card-shadow)' : '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 520
    }}>
      {/* Table Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1'}`,
            borderRadius: 8,
            background: isDark ? 'rgba(22, 33, 56, 0.6)' : '#f8fafc',
            width: 240
          }}>
            <Search size={15} color={isDark ? '#94a3b8' : '#94a3b8'} />
            <input
              type="text"
              placeholder="Search sample or label..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 13,
                width: '100%',
                color: isDark ? '#f8fafc' : '#0f172a'
              }}
            />
          </div>

          {/* Cluster Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: isDark ? '#94a3b8' : '#475569' }}>
            <Filter size={15} color={isDark ? '#94a3b8' : '#64748b'} />
            <span style={{ fontWeight: 600 }}>Filter:</span>
            <select
              value={clusterFilter}
              onChange={e => { setClusterFilter(e.target.value); setPage(0); }}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1'}`,
                background: isDark ? 'rgba(22, 33, 56, 0.9)' : '#f8fafc',
                fontSize: 12,
                fontWeight: 600,
                color: isDark ? '#f8fafc' : '#0f172a'
              }}
            >
              <option value="all" style={{ background: isDark ? '#0f172a' : '#ffffff' }}>All Points ({tableRows.length})</option>
              {dbscanResult?.clusterStats.map(stat => (
                <option key={stat.id} value={stat.id === -1 ? 'noise' : String(stat.id)} style={{ background: isDark ? '#0f172a' : '#ffffff' }}>
                  {stat.name} ({stat.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 8,
            background: isDark ? 'rgba(0, 245, 212, 0.1)' : '#f1f5f9',
            border: `1px solid ${isDark ? 'rgba(0, 245, 212, 0.3)' : '#cbd5e1'}`,
            color: isDark ? '#00f5d4' : '#0f172a',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Download size={14} color={isDark ? '#00f5d4' : '#0284c7'} />
          Export Transformed CSV
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', flex: 1, border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`, borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{
              background: isDark ? 'rgba(22, 33, 56, 0.8)' : '#f8fafc',
              borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
              color: isDark ? '#94a3b8' : '#475569',
              fontWeight: 600
            }}>
              <th style={{ padding: '11px 14px' }}>Sample ID</th>
              <th style={{ padding: '11px 14px' }}>Class / Subtype</th>
              <th style={{ padding: '11px 14px' }}>DBSCAN Status</th>
              <th style={{ padding: '11px 14px' }}>PC1 Coord</th>
              <th style={{ padding: '11px 14px' }}>PC2 Coord</th>
              <th style={{ padding: '11px 14px' }}>PC3 Coord</th>
              {pcaResult.featureNames.slice(0, 4).map(f => (
                <th key={f} style={{ padding: '11px 14px' }}>{f}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map(r => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9'}`, color: isDark ? '#f8fafc' : '#1e293b' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }}>#{r.id}</td>
                <td style={{ padding: '10px 14px' }}>{r.label}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    background: r.clusterId === -1
                      ? (isDark ? 'rgba(148, 163, 184, 0.15)' : '#f1f5f9')
                      : (isDark ? 'rgba(0, 245, 212, 0.15)' : '#e0f2fe'),
                    color: r.clusterId === -1
                      ? (isDark ? '#94a3b8' : '#64748b')
                      : (isDark ? '#00f5d4' : '#0369a1'),
                    border: `1px solid ${r.clusterId === -1
                      ? (isDark ? 'rgba(148, 163, 184, 0.25)' : '#cbd5e1')
                      : (isDark ? 'rgba(0, 245, 212, 0.3)' : '#bae6fd')}`
                  }}>
                    {r.clusterName}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: isDark ? '#00f5d4' : '#0369a1' }}>{r.pc1}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: isDark ? '#cbd5e1' : '#334155' }}>{r.pc2}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: isDark ? '#cbd5e1' : '#334155' }}>{r.pc3}</td>
                {pcaResult.featureNames.slice(0, 4).map((f, fIdx) => (
                  <td key={f} style={{ padding: '10px 14px', color: isDark ? '#94a3b8' : '#64748b' }}>
                    {r.original[fIdx] !== undefined ? Number(r.original[fIdx]).toFixed(2) : '-'}
                  </td>
                ))}
              </tr>
            ))}
            {pagedRows.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: 30, textAlign: 'center', color: isDark ? '#64748b' : '#94a3b8' }}>
                  No matching samples found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
        <span>Showing {filteredRows.length > 0 ? page * pageSize + 1 : 0} to {Math.min((page + 1) * pageSize, filteredRows.length)} of {filteredRows.length} records</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1'}`,
              background: page === 0
                ? (isDark ? 'rgba(22, 33, 56, 0.3)' : '#f8fafc')
                : (isDark ? 'rgba(22, 33, 56, 0.8)' : '#ffffff'),
              color: page === 0 ? (isDark ? '#64748b' : '#94a3b8') : (isDark ? '#f8fafc' : '#0f172a'),
              cursor: page === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>
          <span style={{ padding: '4px 8px', fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }}>Page {page + 1} of {Math.max(1, pageCount)}</span>
          <button
            disabled={page >= pageCount - 1}
            onClick={() => setPage(p => p + 1)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1'}`,
              background: page >= pageCount - 1
                ? (isDark ? 'rgba(22, 33, 56, 0.3)' : '#f8fafc')
                : (isDark ? 'rgba(22, 33, 56, 0.8)' : '#ffffff'),
              color: page >= pageCount - 1 ? (isDark ? '#64748b' : '#94a3b8') : (isDark ? '#f8fafc' : '#0f172a'),
              cursor: page >= pageCount - 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
