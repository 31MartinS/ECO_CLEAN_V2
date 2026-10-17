import { beforeEach, describe, expect, it, vi } from 'vitest'
import { productos } from '../../../services/operarioMock'
import { createAssistantSimulation } from './assistant-simulation'
import { loadAssistantData } from './assistant-data'

const mocks = vi.hoisted(() => ({
  configured: false,
  snapshot: vi.fn(),
  localCatalog: vi.fn(),
  remote: vi.fn(),
}))
vi.mock('../../../services/supervisor', () => ({
  obtenerDatosExplicadorSupervisor: mocks.snapshot,
}))
vi.mock('../../../services/productos', () => ({
  listarProductosCatalogo: mocks.localCatalog,
}))
vi.mock('../../../services/supabase', () => ({
  get isSupabaseConfigured() {
    return mocks.configured
  },
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({ limit: () => ({ abortSignal: mocks.remote }) }),
      }),
    }),
  },
}))

describe('carga del conversatorio en ECO_CLEAN_V2', () => {
  beforeEach(() => {
    mocks.configured = false
    mocks.snapshot
      .mockReset()
      .mockResolvedValue({
        origin: 'local',
        tasks: [],
        limitations: ['local'],
        catalogSimulated: true,
      })
    mocks.localCatalog.mockReset().mockResolvedValue(productos)
    mocks.remote.mockReset().mockResolvedValue({ data: [], error: null })
  })
  it('usa el escenario aislado ante una carga local vacía', async () => {
    const result = await loadAssistantData()
    expect(result.simulatedScenario).toBe(true)
    expect(result.snapshot.tasks).toHaveLength(4)
    expect(result.catalog.products).toHaveLength(6)
    expect(mocks.remote).not.toHaveBeenCalled()
  })
  it('conserva las tareas y los productos locales ya existentes', async () => {
    const snapshot = createAssistantSimulation().snapshot
    mocks.snapshot.mockResolvedValue(snapshot)
    mocks.localCatalog.mockResolvedValue([
      {
        ...productos[0],
        id: 'custom',
        nombre: 'Producto local del supervisor',
      },
    ])
    const result = await loadAssistantData()
    expect(result.snapshot).toBe(snapshot)
    expect(result.simulatedScenario).toBe(false)
    expect(result.catalog.products[0].name).toBe(
      'Producto local del supervisor',
    )
  })
  it('conserva una respuesta remota vacía sin introducir tareas ficticias', async () => {
    mocks.configured = true
    mocks.snapshot.mockResolvedValue({
      origin: 'supabase',
      tasks: [],
      limitations: [],
      catalogSimulated: false,
    })
    const result = await loadAssistantData()
    expect(result.simulatedScenario).toBe(false)
    expect(result.snapshot.tasks).toHaveLength(0)
    expect(result.catalog.simulated).toBe(false)
    expect(result.catalog.products).toHaveLength(0)
  })
  it('un error remoto no se sustituye por tareas de demostración', async () => {
    mocks.configured = true
    mocks.snapshot.mockResolvedValue({
      origin: 'local',
      tasks: [],
      limitations: ['remote_unavailable'],
      catalogSimulated: true,
    })
    mocks.remote.mockResolvedValue({
      data: null,
      error: { message: 'unavailable' },
    })
    const result = await loadAssistantData()
    expect(result.simulatedScenario).toBe(false)
    expect(result.snapshot.limitations).toContain('remote_unavailable')
    expect(result.catalog.simulated).toBe(true)
  })
  it('limita la proyección remota al catálogo técnico necesario', async () => {
    mocks.configured = true
    mocks.snapshot.mockResolvedValue(createAssistantSimulation().snapshot)
    mocks.remote.mockResolvedValue({
      data: Array.from({ length: 51 }, (_, index) => ({
        id: String(index),
        nombre: 'Producto',
        ph: 7,
        password: 'excluded-field',
      })),
      error: null,
    })
    const result = await loadAssistantData()
    expect(result.catalog.partial).toBe(true)
    expect(result.catalog.products).toHaveLength(50)
    expect(JSON.stringify(result.catalog)).not.toContain('excluded-field')
  })
})
