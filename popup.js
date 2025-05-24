// タイムアウト付きfetch関数
function fetchWithTimeout(url, timeout = 5000) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
}

// リトライ機能付きfetch関数
async function fetchWithRetry(url, maxRetries = 2, timeout = 5000) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, timeout);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt < maxRetries) {
        // 次の試行前に少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  throw lastError;
}

// 成功音を再生する関数
function playSuccessSound() {
  try {
    // 短いビープ音を生成
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.log('Could not play success sound:', error);
  }
}

// エラー音を再生する関数
function playErrorSound() {
  try {
    // エラー用のビープ音を生成
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 下降音（エラー音）
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('Could not play error sound:', error);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    let currentTab = tabs[0];
    chrome.storage.sync.get({targetUrlTemplate: 'https://r.jina.ai/${targetUrl}'}, function(items) {
      let targetUrl = items.targetUrlTemplate.replace('${targetUrl}', currentTab.url);

      // ローディング表示
      document.getElementById("message").textContent = "Processing...";

      // Service workerに処理を依頼
      chrome.runtime.sendMessage({
        type: 'process-content',
        tabUrl: currentTab.url,
        targetUrlTemplate: items.targetUrlTemplate
      }, function(response) {
        if (response && response.success) {
          // データが取得できた場合、ポップアップでもクリップボードにコピーを試行（フォールバック）
          if (response.data) {
            navigator.clipboard.writeText(response.data).then(() => {
              console.log('Popup: Successfully copied to clipboard');
            }).catch(error => {
              console.log('Popup: Clipboard write failed, trying execCommand:', error);
              // execCommandでのフォールバック
              try {
                const textArea = document.createElement('textarea');
                textArea.value = response.data;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                console.log('Popup: execCommand copy successful');
              } catch (execError) {
                console.error('Popup: execCommand also failed:', execError);
              }
            });
          }
          
          let messageElement = document.getElementById("message");
          messageElement.innerHTML = `
            <a href="${response.targetUrl}" target="_blank">${response.targetUrl}</a>
            <br>has been copied to clipboard
          `;
          
          let linkElement = messageElement.querySelector('a');
          linkElement.style.color = '#0000EE';
          linkElement.style.textDecoration = 'underline';
          linkElement.style.wordBreak = 'break-all';
          
          // 音はservice workerで再生されるため、ここでは再生しない
          // （service workerのメッセージリスナーで音を再生）
        } else {
          console.error('An error occurred:', response ? response.error : 'Unknown error');
          document.getElementById("message").textContent = "An error occurred: " + (response ? response.error : 'Unknown error');
          
          // 音はservice workerで再生されるため、ここでは再生しない
          // （service workerのメッセージリスナーで音を再生）
        }
      });
    });
  });
});
