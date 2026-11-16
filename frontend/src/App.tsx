import styles from './App.module.css'
import { Calculator } from './features/calculator/Calculator'

function App() {
  return (
    <main className={styles.main}>
      <Calculator />
    </main>
  )
}

export default App
