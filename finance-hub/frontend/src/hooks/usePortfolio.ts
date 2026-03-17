import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../utils/api'
import type { Holding, PriceAlert, PortfolioSnapshot } from '../types'

export function usePortfolio() {
  return useQuery<Holding[]>({
    queryKey: ['portfolio', 'holdings'],
    queryFn: async () => {
      const { data } = await api.get('/portfolio')
      return data
    },
    staleTime: 60_000,
  })
}

export function usePortfolioSnapshots() {
  return useQuery<PortfolioSnapshot[]>({
    queryKey: ['portfolio', 'snapshots'],
    queryFn: async () => {
      const { data } = await api.get('/portfolio/snapshots')
      return data
    },
    staleTime: 300_000,
  })
}

export function useAddHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (holding: Omit<Holding, 'id'>) =>
      api.post('/portfolio/holding', holding),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })
}

export function useRemoveHolding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/portfolio/holding/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })
}

export function useAlerts() {
  return useQuery<PriceAlert[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data } = await api.get('/alerts')
      return data
    },
    staleTime: 60_000,
  })
}

export function useCreateAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (alert: Omit<PriceAlert, 'id' | 'triggered' | 'createdAt'>) =>
      api.post('/alerts', alert),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}

export function useDeleteAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/alerts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}
