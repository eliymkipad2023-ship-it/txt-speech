// 日本語テキスト読み上げアプリ
// Web Speech API を使用

class TextToSpeechApp {
    constructor() {
        // DOM要素
        this.textInput = document.getElementById('text-input');
        this.voiceSelect = document.getElementById('voice-select');
        this.rateSlider = document.getElementById('rate-slider');
        this.rateValue = document.getElementById('rate-value');
        this.pitchSlider = document.getElementById('pitch-slider');
        this.pitchValue = document.getElementById('pitch-value');
        this.playBtn = document.getElementById('play-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.downloadBtn = document.getElementById('download-btn');
        this.charCount = document.getElementById('char-count');
        this.status = document.getElementById('status');
        this.recordingProgress = document.getElementById('recording-progress');
        this.progressFill = document.getElementById('progress-fill');
        this.recordingStatus = document.getElementById('recording-status');

        // 状態
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.currentUtterance = null;
        this.isRecording = false;

        this.init();
    }

    init() {
        // 音声リストの読み込み
        this.loadVoices();

        // Chrome では voiceschanged イベントで音声が読み込まれる
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }

        // イベントリスナー
        this.textInput.addEventListener('input', () => this.updateCharCount());
        this.rateSlider.addEventListener('input', () => this.updateRateDisplay());
        this.pitchSlider.addEventListener('input', () => this.updatePitchDisplay());
        this.playBtn.addEventListener('click', () => this.speak());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.downloadBtn.addEventListener('click', () => this.download());

        // 初期値
        this.updateCharCount();
        this.updateRateDisplay();
        this.updatePitchDisplay();

        // Web Speech API のサポート確認
        if (!('speechSynthesis' in window)) {
            this.showStatus('このブラウザはWeb Speech APIに対応していません。', 'error');
            this.playBtn.disabled = true;
            this.downloadBtn.disabled = true;
        }
    }

    loadVoices() {
        this.voices = this.synth.getVoices();

        // 日本語音声をフィルタリング
        const japaneseVoices = this.voices.filter(voice =>
            voice.lang.startsWith('ja') || voice.lang.startsWith('jp')
        );

        this.voiceSelect.innerHTML = '';

        if (japaneseVoices.length > 0) {
            japaneseVoices.forEach((voice, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${voice.name} (${voice.lang})`;
                option.dataset.voiceName = voice.name;
                this.voiceSelect.appendChild(option);
            });
            this.voices = japaneseVoices;
        } else if (this.voices.length > 0) {
            // 日本語音声がない場合は全ての音声を表示
            this.voices.forEach((voice, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${voice.name} (${voice.lang})`;
                option.dataset.voiceName = voice.name;
                this.voiceSelect.appendChild(option);
            });
            this.showStatus('日本語音声が見つかりませんでした。他の音声を使用できます。', 'warning');
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'デフォルト音声';
            this.voiceSelect.appendChild(option);
        }
    }

    updateCharCount() {
        const count = this.textInput.value.length;
        this.charCount.textContent = count;
    }

    updateRateDisplay() {
        this.rateValue.textContent = this.rateSlider.value;
    }

    updatePitchDisplay() {
        this.pitchValue.textContent = this.pitchSlider.value;
    }

    createUtterance(text) {
        const utterance = new SpeechSynthesisUtterance(text);

        // 音声を設定
        const selectedIndex = parseInt(this.voiceSelect.value);
        if (!isNaN(selectedIndex) && this.voices[selectedIndex]) {
            utterance.voice = this.voices[selectedIndex];
        }

        // 速度とピッチを設定
        utterance.rate = parseFloat(this.rateSlider.value);
        utterance.pitch = parseFloat(this.pitchSlider.value);
        utterance.lang = 'ja-JP';

        return utterance;
    }

    speak() {
        const text = this.textInput.value.trim();

        if (!text) {
            this.showStatus('テキストを入力してください。', 'warning');
            return;
        }

        // 既存の音声を停止
        this.synth.cancel();

        const utterance = this.createUtterance(text);
        this.currentUtterance = utterance;

        // イベントハンドラ
        utterance.onstart = () => {
            this.playBtn.classList.add('speaking');
            this.playBtn.innerHTML = '<span class="btn-icon">🔊</span> 再生中...';
            this.stopBtn.disabled = false;
            this.showStatus('再生中...', 'info');
        };

        utterance.onend = () => {
            this.playBtn.classList.remove('speaking');
            this.playBtn.innerHTML = '<span class="btn-icon">▶️</span> 再生';
            this.stopBtn.disabled = true;
            this.showStatus('再生完了', 'success');
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.playBtn.classList.remove('speaking');
            this.playBtn.innerHTML = '<span class="btn-icon">▶️</span> 再生';
            this.stopBtn.disabled = true;

            if (event.error !== 'interrupted') {
                this.showStatus(`エラー: ${event.error}`, 'error');
            }
        };

        this.synth.speak(utterance);
    }

    stop() {
        this.synth.cancel();
        this.playBtn.classList.remove('speaking');
        this.playBtn.innerHTML = '<span class="btn-icon">▶️</span> 再生';
        this.stopBtn.disabled = true;
        this.showStatus('停止しました', 'info');
    }

    async download() {
        const text = this.textInput.value.trim();

        if (!text) {
            this.showStatus('テキストを入力してください。', 'warning');
            return;
        }

        // ダウンロード機能の実装
        // システム音声をキャプチャして録音
        try {
            this.showStatus('音声を生成中...', 'info');
            this.downloadBtn.disabled = true;
            this.playBtn.disabled = true;

            // 録音準備
            this.recordingProgress.classList.remove('hidden');
            this.recordingStatus.textContent = '画面共有ダイアログで「システム音声を共有」を選択してください';
            this.progressFill.style.width = '0%';

            // システム音声をキャプチャ
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            // ビデオトラックを停止（音声のみ必要）
            stream.getVideoTracks().forEach(track => track.stop());

            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                throw new Error('音声トラックが取得できませんでした。「システム音声を共有」を選択してください。');
            }

            // 音声ストリームのみ抽出
            const audioStream = new MediaStream(audioTracks);

            // MediaRecorder で録音
            const mediaRecorder = new MediaRecorder(audioStream, {
                mimeType: this.getSupportedMimeType()
            });

            const audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            const recordingPromise = new Promise((resolve, reject) => {
                mediaRecorder.onstop = () => {
                    resolve(audioChunks);
                };
                mediaRecorder.onerror = (event) => {
                    reject(event.error);
                };
            });

            // 録音開始
            mediaRecorder.start();
            this.isRecording = true;
            this.recordingStatus.textContent = '録音中...';

            // テキストを読み上げ
            const utterance = this.createUtterance(text);

            // 再生時間を推定（おおよそ）
            const estimatedDuration = (text.length / 5) * (1 / parseFloat(this.rateSlider.value)) * 1000;
            let startTime = Date.now();

            utterance.onstart = () => {
                startTime = Date.now();
            };

            // プログレス更新
            const progressInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min((elapsed / estimatedDuration) * 100, 95);
                this.progressFill.style.width = `${progress}%`;
            }, 100);

            await new Promise((resolve, reject) => {
                utterance.onend = resolve;
                utterance.onerror = (e) => {
                    if (e.error !== 'interrupted') {
                        reject(new Error(e.error));
                    } else {
                        resolve();
                    }
                };
                this.synth.speak(utterance);
            });

            clearInterval(progressInterval);
            this.progressFill.style.width = '100%';
            this.recordingStatus.textContent = 'ファイルを準備中...';

            // 録音を停止
            mediaRecorder.stop();
            audioStream.getTracks().forEach(track => track.stop());

            // 録音データを取得
            const chunks = await recordingPromise;

            // Blob を作成
            const mimeType = this.getSupportedMimeType();
            const blob = new Blob(chunks, { type: mimeType });

            // ダウンロード
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `speech_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${this.getFileExtension(mimeType)}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showStatus('ダウンロード完了！', 'success');

        } catch (error) {
            console.error('Download error:', error);

            if (error.name === 'NotAllowedError') {
                this.showStatus('画面共有がキャンセルされました。', 'warning');
            } else {
                this.showStatus(`エラー: ${error.message}`, 'error');
            }
        } finally {
            this.isRecording = false;
            this.downloadBtn.disabled = false;
            this.playBtn.disabled = false;
            this.recordingProgress.classList.add('hidden');
        }
    }

    getSupportedMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4',
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return 'audio/webm';
    }

    getFileExtension(mimeType) {
        if (mimeType.includes('webm')) return 'webm';
        if (mimeType.includes('ogg')) return 'ogg';
        if (mimeType.includes('mp4')) return 'm4a';
        return 'webm';
    }

    showStatus(message, type) {
        this.status.textContent = message;
        this.status.className = `status ${type}`;

        // 成功メッセージは3秒後に非表示
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (this.status.textContent === message) {
                    this.status.className = 'status';
                }
            }, 3000);
        }
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new TextToSpeechApp();
});
