import { useEffect, useState } from 'react'
import { apiUrl } from './api'
import './TreeInspector.css'

type TreeResult = { tree_id: number; depth: number; split_conditions: string[]; leaf_values: number[]; note: string }

export function TreeInspector({ treeId, trained }: { treeId: number; trained: boolean }) {
  const [tree, setTree] = useState<TreeResult | null>(null)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (!trained) return
    const controller = new AbortController()
    fetch(apiUrl(`/api/tree/${treeId}`), { signal: controller.signal })
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.detail || 'Tree data is unavailable.'); return payload as TreeResult })
      .then((result) => { setTree(result); setMessage('') })
      .catch((error: unknown) => { if (!controller.signal.aborted) { setTree(null); setMessage(error instanceof Error ? error.message : 'Tree data is unavailable.') } })
    return () => controller.abort()
  }, [treeId, trained])

  const activeTree = tree?.tree_id === treeId ? tree : null
  return <div className="tree-api-view">{activeTree ? <>
    <div className="tree-api-heading"><span>TREE {activeTree.tree_id}</span><span>DEPTH {activeTree.depth}</span></div>
    <div className="tree-api-splits">{activeTree.split_conditions.length ? activeTree.split_conditions.map((split, index) => <div key={`${index}-${split}`}><b>{index === 0 ? 'ROOT' : `SPLIT ${index + 1}`}</b><span>{split}</span></div>) : <span>This tree has no exposed split conditions.</span>}</div>
    <div className="tree-api-leaves"><b>LEAF VALUES</b>{activeTree.leaf_values.slice(0, 16).map((value, index) => <span key={index}>L{index} <strong>{value.toFixed(4)}</strong></span>)}</div>
    <p>{activeTree.note}</p>
  </> : <p>{!trained ? 'Train a model to inspect its actual splits and leaf values.' : message || 'Loading tree details…'}</p>}</div>
}