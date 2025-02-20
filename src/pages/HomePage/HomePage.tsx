import { FunctionComponent } from "react"
import ChatInterface from "../../components/chat/ChatInterface"

type HomePageProps = {
  width: number
  height: number
}

const HomePage: FunctionComponent<HomePageProps> = ({ width, height }) => {
  return (
    <ChatInterface width={width} height={height} />
  )
}

export default HomePage;
