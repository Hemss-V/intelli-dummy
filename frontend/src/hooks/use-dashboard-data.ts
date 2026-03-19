import { useQuery } from "@tanstack/react-query";
import {
  MOCK_KPI,
  MOCK_DISCREPANCIES,
  MOCK_ALERTS,
  MOCK_VELOCITY,
  MOCK_NODES,
  MOCK_EDGES,
  MOCK_INVOICE_QUEUE
} from "../lib/mockData";

const API_BASE = 'http://localhost:3000/api';
const HEADERS = {
  'Content-Type': 'application/json',
  'x-lender-id': '1'
};

export function useKPI() {
  return useQuery({
    queryKey: ["kpi"],
    queryFn: async () => {
      try {
        const res = await fetch(`${API_BASE}/kpi`, { headers: HEADERS });
        if (!res.ok) throw new Error('Failed');
        return await res.json();
      } catch (e) {
        console.error(e);
        return MOCK_KPI; // Fallback
      }
    },
    refetchInterval: 5000
  });
}

export function useDiscrepancies() {
  return useQuery({
    queryKey: ["discrepancies"],
    queryFn: async () => {
      try {
        const res = await fetch(`${API_BASE}/discrepancies`, { headers: HEADERS });
        if (!res.ok) throw new Error('Failed');
        return await res.json();
      } catch (e) {
        return MOCK_DISCREPANCIES;
      }
    },
    refetchInterval: 10000
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      try {
        const res = await fetch(`${API_BASE}/alerts`, { headers: HEADERS });
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        return data.map((alert: any) => ({
          id: alert.id,
          fingerprint: alert.invoice_number || `INV-${alert.invoice_id}`,
          priority: alert.severity ? alert.severity.toLowerCase() : 'high',
          amount: 0,
          date: alert.created_at
        }));
      } catch (e) {
        return MOCK_ALERTS;
      }
    },
    refetchInterval: 5000
  });
}

export function useVelocity() {
  return useQuery({
    queryKey: ["velocity"],
    queryFn: async () => {
      try {
        const res = await fetch(`${API_BASE}/velocity`, { headers: HEADERS });
        if (!res.ok) throw new Error('Failed');
        return await res.json();
      } catch (e) {
        return MOCK_VELOCITY;
      }
    },
  });
}

export function useNetwork() {
  return useQuery({
    queryKey: ["network-topology"],
    queryFn: async () => {
      // 1. Check for retail overrides first
      const localData = localStorage.getItem("sherlock-retail-topology");
      if (localData) {
        return JSON.parse(localData);
      }

      // 2. Fetch real topology
      try {
        const res = await fetch(`${API_BASE}/graph/topology`, { headers: HEADERS });
        if (!res.ok) throw new Error('Failed');
        const topology = await res.json();

        if (topology.nodes.length === 0) return { nodes: MOCK_NODES, edges: MOCK_EDGES };

        const mappedNodes = topology.nodes.map((n: any) => ({
          id: n.id,
          label: `${n.name}\n(${n.tier || 'T1'})`,
          tier: n.tier || 'T1',
          riskScore: n.tier === 'T3' ? 85 : 20,
          isFlagged: n.tier === 'T3'
        }));

        const mappedEdges = topology.edges.map((e: any, idx: number) => ({
          id: idx + 1,
          source: e.source,
          target: e.target,
          type: "normal",
          label: `$${e.total_volume}`
        }));

        return { nodes: mappedNodes, edges: mappedEdges };
      } catch (e) {
        return { nodes: MOCK_NODES, edges: MOCK_EDGES };
      }
    },
    refetchInterval: 10000
  });
}

export function useInvoiceQueue() {
  return useQuery({
    queryKey: ["invoice-queue"],
    queryFn: async () => {
      try {
        const res = await fetch(`${API_BASE}/lender/1/portfolio`, { headers: HEADERS });
        if (!res.ok) throw new Error('Failed');
        const invoices = await res.json();

        if (invoices.length === 0) return MOCK_INVOICE_QUEUE;

        return invoices.map((inv: any) => ({
          id: inv.invoice_number,
          supplier: "Supplier ID: " + (inv.supplier_id || '?'),
          amount: parseFloat(inv.amount),
          date: inv.invoice_date,
          status: inv.status,
          riskScore: inv.risk_score || 0
        }));
      } catch (e) {
        return MOCK_INVOICE_QUEUE;
      }
    },
    refetchInterval: 5000
  });
}
