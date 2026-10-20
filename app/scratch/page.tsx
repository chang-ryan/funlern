import { ScratchChat } from '@/components/chat/scratch-chat'
import { currentModelId } from '@/lib/ai/model'

export default async function Home() {
  return <ScratchChat model={await currentModelId()} />
}
