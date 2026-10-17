import { describe, expect, it, vi } from 'vitest'

const query = vi.hoisted(() => ({
  select: vi.fn(),
  order: vi.fn(),
}))

vi.mock('../../services/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: vi.fn(() => ({
      select: query.select.mockReturnValue({ order: query.order }),
    })),
  },
}))

import { obtenerComparacionVariantesSupervisor } from '../../services/supervisor'

describe('nombres de variantes en la comparación del supervisor', () => {
  it('conserva el nombre obtenido de Supabase junto con su ID y sus consumos', async () => {
    const id = 'b08f90be-9f09-4e0b-a150-42ae89b3219d'
    query.order.mockResolvedValueOnce({
      data: [
        {
          id,
          nombre: 'Lavado de pisos',
          registros_uso: [
            {
              litros_agua_reales: 5,
              ml_producto_reales: 10,
              marca: 'medido',
              fuente: 'manual',
              resultados: [{ cumple_criterio: true }],
            },
          ],
        },
      ],
      error: null,
    })

    const result = await obtenerComparacionVariantesSupervisor(3)

    expect(result.resumen).toMatchObject([
      {
        variante_id: id,
        nombre: 'Lavado de pisos',
        agua_promedio: 5,
        producto_promedio: 10,
        tasa_cumplimiento: 1,
        n_medidos: 1,
        elegible: false,
      },
    ])
    expect(result.recomendada).toBeNull()
    expect(query.select).toHaveBeenCalledWith(
      expect.stringContaining('id, nombre'),
    )
  })
})
