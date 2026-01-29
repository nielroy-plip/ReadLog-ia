import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

function App() {
    const [greeting, setGreeting] = useState('');
    const [name, setName] = useState('');

    async function greet() {
        const result = await invoke<string>('greet', { name });
        setGreeting(result);
    }

    return (
    <div className="container">
      <h1>Log Analyzer</h1>
      
      <div className="test-section">
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={greet}>Greet</button>
        {greeting && <p>{greeting}</p>}
      </div>

      <div className="info">
        <p>✅ Tauri + React funcionando!</p>
        <p>Próximos passos: Implementar UI completa</p>
      </div>
    </div>
  );
}

export default App;