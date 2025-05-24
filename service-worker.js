// Service Worker for TargetClip Extension

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

// コンテンツを取得してクリップボードにコピーする関数
async function processContent(tabUrl, targetUrlTemplate) {
  try {
    const targetUrl = targetUrlTemplate.replace('${targetUrl}', tabUrl);
    
    const response = await fetchWithRetry(targetUrl, 2, 5000);
    const data = await response.text();
    
    // 既存のoffscreen documentがあるかチェック
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    
    if (existingContexts.length === 0) {
      // offscreen documentを作成
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['CLIPBOARD'],
        justification: 'Write text to clipboard'
      });
    }
    
    // offscreen documentにメッセージを送信して結果を待つ
    const clipboardResult = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'copy-to-clipboard',
        text: data,
        playSound: false  // 音は後で別途再生するため、ここではfalse
      }, (response) => {
        resolve(response);
      });
    });
    
    if (!clipboardResult || !clipboardResult.success) {
      throw new Error('Failed to copy to clipboard');
    }
    
    return { success: true, targetUrl, data };
  } catch (error) {
    console.error('Error processing content:', error);
    return { success: false, error: error.message };
  }
}

// アクションボタンがクリックされた時の処理
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Action button clicked for tab:', tab.url);
  
  // 実行開始通知
  chrome.notifications.create('targetclip-start', {
    type: 'basic',
    iconUrl: 'icon48.png',
    title: 'TargetClip',
    message: 'Processing content...'
  });
  
  try {
    const items = await chrome.storage.sync.get({
      targetUrlTemplate: 'https://r.jina.ai/${targetUrl}'
    });
    
    // offscreen documentを確実に作成
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });
    
    if (existingContexts.length === 0) {
      console.log('Creating offscreen document for action click');
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['CLIPBOARD'],
        justification: 'Write text to clipboard and play sound'
      });
      // offscreen documentの初期化を待つ
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const result = await processContent(tab.url, items.targetUrlTemplate);
    
    // 開始通知をクリア
    chrome.notifications.clear('targetclip-start');
    
    if (result.success) {
      console.log('Content processing successful, playing success sound');
      
      // 成功通知
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'TargetClip',
        message: 'Content copied to clipboard successfully!'
      });
      
      // 成功音を再生
      setTimeout(() => {
        chrome.runtime.sendMessage({
          type: 'play-success-sound'
        }).catch(error => {
          console.log('Could not send success sound message:', error);
        });
      }, 200);
      
    } else {
      console.log('Content processing failed, playing error sound');
      
      // エラー通知
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'TargetClip Error',
        message: `Error: ${result.error}`
      });
      
      // エラー音を再生
      setTimeout(() => {
        chrome.runtime.sendMessage({
          type: 'play-error-sound'
        }).catch(error => {
          console.log('Could not send error sound message:', error);
        });
      }, 200);
    }
  } catch (error) {
    console.error('Error in action click handler:', error);
    
    // 開始通知をクリア
    chrome.notifications.clear('targetclip-start');
    
    // エラー通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'TargetClip Error',
      message: `Unexpected error: ${error.message}`
    });
    
    // エラー音を再生
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: 'play-error-sound'
      }).catch(soundError => {
        console.log('Could not send error sound message:', soundError);
      });
    }, 200);
  }
});

// メッセージリスナー（popup.jsからの要求を処理）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'process-content') {
    processContent(request.tabUrl, request.targetUrlTemplate)
      .then(result => {
        // ポップアップからの要求の場合も音を再生
        if (result.success) {
          setTimeout(() => {
            chrome.runtime.sendMessage({
              type: 'play-success-sound'
            }).catch(error => {
              console.log('Could not send success sound message from popup handler:', error);
            });
          }, 200);
        } else {
          setTimeout(() => {
            chrome.runtime.sendMessage({
              type: 'play-error-sound'
            }).catch(error => {
              console.log('Could not send error sound message from popup handler:', error);
            });
          }, 200);
        }
        sendResponse(result);
      })
      .catch(error => {
        // エラーの場合も音を再生
        setTimeout(() => {
          chrome.runtime.sendMessage({
            type: 'play-error-sound'
          }).catch(soundError => {
            console.log('Could not send error sound message from popup handler:', soundError);
          });
        }, 200);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 非同期レスポンスを示す
  }
});
