// Offscreen document for clipboard operations

// 成功音を再生する関数
function playSuccessSound() {
  try {
    console.log('Attempting to play success sound in offscreen document');
    
    // AudioContextを作成
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // AudioContextが suspended状態の場合は resume する
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        playSuccessBeep(audioContext);
      });
    } else {
      playSuccessBeep(audioContext);
    }
  } catch (error) {
    console.log('Could not play success sound:', error);
  }
}

// エラー音を再生する関数
function playErrorSound() {
  try {
    console.log('Attempting to play error sound in offscreen document');
    
    // AudioContextを作成
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // AudioContextが suspended状態の場合は resume する
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        playErrorBeep(audioContext);
      });
    } else {
      playErrorBeep(audioContext);
    }
  } catch (error) {
    console.log('Could not play error sound:', error);
  }
}

// 成功ビープ音を再生する関数
function playSuccessBeep(audioContext) {
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 上昇音（成功音）
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
    
    console.log('Success sound played in offscreen document');
  } catch (error) {
    console.log('Error playing success beep:', error);
  }
}

// エラービープ音を再生する関数
function playErrorBeep(audioContext) {
  try {
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
    
    console.log('Error sound played in offscreen document');
  } catch (error) {
    console.log('Error playing error beep:', error);
  }
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'copy-to-clipboard') {
    // まずexecCommandを試す（より確実）
    try {
      const textArea = document.createElement('textarea');
      textArea.value = request.text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        console.log('Successfully copied using execCommand');
        
        // playSoundフラグがtrueの場合のみ音を再生
        if (request.playSound) {
          setTimeout(() => {
            playSuccessSound();
          }, 100);
        }
        
        sendResponse({ success: true });
        return true;
      } else {
        throw new Error('execCommand copy failed');
      }
    } catch (execError) {
      console.log('execCommand failed, trying navigator.clipboard:', execError);
      
      // フォールバック: navigator.clipboardを試す
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(request.text).then(() => {
          console.log('Successfully copied to clipboard using navigator.clipboard');
          
          // playSoundフラグがtrueの場合のみ音を再生
          if (request.playSound) {
            setTimeout(() => {
              playSuccessSound();
            }, 100);
          }
          
          sendResponse({ success: true });
        }).catch(clipboardError => {
          console.error('Both copy methods failed:', clipboardError);
          sendResponse({ success: false, error: `Copy failed: ${clipboardError.message}` });
        });
      } else {
        console.error('No clipboard API available');
        sendResponse({ success: false, error: 'No clipboard API available' });
      }
    }
    return true; // 非同期レスポンスを示す
  } else if (request.type === 'play-sound-only') {
    // 音のみを再生（後方互換性のため）
    console.log('Playing sound only');
    setTimeout(() => {
      playSuccessSound();
    }, 100);
    sendResponse({ success: true });
    return true;
  } else if (request.type === 'play-success-sound') {
    // 成功音を再生
    console.log('Playing success sound');
    setTimeout(() => {
      playSuccessSound();
    }, 100);
    sendResponse({ success: true });
    return true;
  } else if (request.type === 'play-error-sound') {
    // エラー音を再生
    console.log('Playing error sound');
    setTimeout(() => {
      playErrorSound();
    }, 100);
    sendResponse({ success: true });
    return true;
  }
});
