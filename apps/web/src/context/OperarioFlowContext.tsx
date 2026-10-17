import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import type { Receta } from '@ecocleaner/core'
import { useEffect } from 'react'
import { obtenerParametrosSistema } from '../services/parametrosSistema'
import { setParametrosOperativos } from '../services/operarioMock'

interface OperarioFlowValue {
  recetaActiva: Receta | null
  setRecetaActiva: (receta: Receta | null) => void
  configVersion: number
}

const OperarioFlowContext = createContext<OperarioFlowValue | null>(null)

/** Estado de flujo en memoria; el id de la tarea viaja en la URL. */
export function OperarioFlowProvider({ children }: PropsWithChildren) {
  const [recetaActiva, setRecetaActiva] = useState<Receta | null>(null)
  const [configVersion, setConfigVersion] = useState(0)
  useEffect(() => { obtenerParametrosSistema().then((params) => { setParametrosOperativos(params); setConfigVersion((version) => version + 1) }).catch(() => undefined) }, [])
  const value = useMemo(
    () => ({ recetaActiva, setRecetaActiva, configVersion }),
    [recetaActiva, configVersion],
  )
  return (
    <OperarioFlowContext.Provider value={value}>
      {children}
    </OperarioFlowContext.Provider>
  )
}

export function useOperarioFlow(): OperarioFlowValue {
  const context = useContext(OperarioFlowContext)
  if (!context)
    throw new Error(
      'useOperarioFlow debe usarse dentro de OperarioFlowProvider',
    )
  return context
}

export { OPERARIO_STEPS } from './flow'
