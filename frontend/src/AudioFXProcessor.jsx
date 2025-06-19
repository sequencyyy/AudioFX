import React, { useState, useRef, useEffect } from 'react';
import { Upload, Button, Card, Slider, Select, Space, Divider, Progress, message, Radio, Switch } from 'antd';
import axios from "axios";
const { Dragger } = Upload;

const AudioFXProcessor = () => {
    const [file, setFile] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [effect, setEffect] = useState('speedup');
    const [speed, setSpeed] = useState(1);
    const [reverbAmount, setReverbAmount] = useState(50);
    const [pitch, setPitch] = useState(1);
    const [volume, setVolume] = useState(0.8);
    const [bass_gain, setBassGain] = useState(0);
    const [flanger_mix, setFlangerMix] = useState(0);
    const [previewUrl, setPreviewUrl] = useState('');
    const [processedUrl, setProcessedUrl] = useState('');
    const [darkMode, setDarkMode] = useState(false);
    const [audioDuration, setAudioDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef(null);
    const previewAudioRef = useRef(null);
    const [taskId, setTaskId] = useState(null);
    const [fileId, setFileId] = useState(null);
    const [processedCurrentTime, setProcessedCurrentTime] = useState(0);
    const [audioKey, setAudioKey] = useState(0);
    const [originalVolume, setOriginalVolume] = useState(100);
    const [processedVolume, setProcessedVolume] = useState(100);
    const [history, setHistory] = useState([]);

    const beforeUpload = async (file) => {
        const isAudio = file.type.startsWith('audio/');
        if (!isAudio) {
            message.error('Только аудио файлы допустимы!');
            return Upload.LIST_IGNORE;
        }
    
        const isLt50M = file.size / 1024 / 1024 < 50;
        if (!isLt50M) {
            message.error('Файл должен быть <50MB!');
            return Upload.LIST_IGNORE;
        }
    
        try {
            const formData = new FormData();
            formData.append("file", file);
            
            const response = await axios.post("/api/files/", formData, {
                
                headers: { "Content-Type": "multipart/form-data" },
            });
            
            setFileId(response.data.file_id);
            setPreviewUrl(URL.createObjectURL(file));
            setFile(file);
            const audio = new Audio(URL.createObjectURL(file));
            audio.onloadedmetadata = () => setAudioDuration(audio.duration);
            
            message.success('Файл загружен!');
            return false;
            
        } catch (error) {
            message.error('Ошибка при загрузке файла');
            console.error(error);
            return Upload.LIST_IGNORE;
        }
    };
    
    const handleProcess = async () => {
        if (!fileId) {
            message.warning('Пожалуйста, загрузите файл');
            return;
        }
    
        try {
            setProcessing(true);
            setProgress(0);
            const response = await axios.post('/api/process', {
                effect_type: effect,
                speed: effect === 'speedup' ? speed : 
                       effect === 'slowed' ? speed :
                       effect === 'nightcore' ? speed :
                       effect === 'alleffects' ? speed : null,
                reverb_amount: effect === 'slowed' ? reverbAmount:
                               effect === 'alleffects' ? reverbAmount : null,
                pitch: effect === 'nightcore' ? pitch :
                       effect === 'alleffects' ? pitch: null,
                bass_gain: effect === 'alleffects' ? bass_gain: null,
                flanger_mix: effect === 'alleffects' ? flanger_mix: null,
                volume: volume
            }, {
                params: { file_id: fileId }
            });
    
            const task_id = response.data.task_id;
            setTaskId(task_id);
            checkTaskStatus(task_id);
    
        } catch (error) {
            message.error('Ошибка при обработке файла');
            setProcessing(false);
        }
    };
    
    const handleOriginalVolume = (value) => {
        setOriginalVolume(value);
        if (previewAudioRef.current) {
            previewAudioRef.current.volume = value / 100;
        }
    };

    const handleProcessedVolume = (value) => {
        setProcessedVolume(value);
        if (audioRef.current) {
            audioRef.current.volume = value / 100;
        }
    };

    const checkTaskStatus = async (taskId) => {
        try {
            const response = await axios.get(`/api/status/${taskId}`);
            
            if (response.data.status === 'pending') {
                setTimeout(() => checkTaskStatus(taskId), 1000);
                setProgress(+1);
            } else if (response.data.status === 'success') {
                // setProcessedUrl(
                //     `api/download/${userId}/${response.data.result}`
                // );
                // const newUrl = `/api/download/${response.data.result}?t=${Date.now()}`;
                const newUrl = `/api/temp-download/${response.data.token}?t=${Date.now()}`;
                setProcessedUrl(newUrl);
                setProgress(100);
                setProcessing(false);
                setAudioKey(Date.now());
                message.success('Обработка завершена');
            } else {
                message.error('Ошибка при обработке');
                setProcessing(false);
            }
        } catch (error) {
            message.error('Status check failed');
            setProcessing(false);
        }
    };
    
    const handleDownload = () => {
        if (!processedUrl) {
            message.warning('Нет доступных аудио файлов!');
            return;
        }
        // ?t=${Date.now()}
        const url = `${processedUrl}`;
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file.name}_processed`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        message.success('Загрузка начата!');
    };
    
    const handlePreviewPlay = () => {
        if (previewAudioRef.current) {
            previewAudioRef.current.play();
        }
    };
    
    const handleProcessedPlay = () => {
        if (audioRef.current) {
            audioRef.current.play();
        }
    };
        const handlePreviewPause = () => {
        if (previewAudioRef.current) {
            previewAudioRef.current.pause();
        }
    };
    
    const handleProcessedPause = () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
    };
    
    const handleTimeUpdate = (e) => {
        setCurrentTime(e.target.currentTime);
    };
    


    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };
    
    const effectSettings = {
        speedup: {
            label: 'Speed Up',
            icon: '🚀',
            description: 'Ускорьте аудио',
            controls: (
                <div className="mt-4">
                    <div className="flex items-center mb-2">
                        <span className="w-24">Speed:</span>
                        <Slider 
                            min={1.0}
                            max={3.0}
                            step={0.1}
                            value={speed}
                            onChange={setSpeed}
                            className="flex-1"
                        />
                        <span className="ml-2 w-10">{speed.toFixed(1)}x</span>
                    </div>
                </div>
            )
        },
        slowed: {
            label: 'Slowed + Reverb',
            icon: '🌀',
            description: 'Замедление аудио и добавление атмосферной реверберации',
            controls: (
                <div className="mt-4">
                    <div className="flex items-center mb-2">
                        <span className="w-24">Speed:</span>
                        <Slider 
                            min={0.5}
                            max={1.0}
                            step={0.05}
                            value={speed}
                            onChange={setSpeed}
                            className="flex-1"
                        />
                        <span className="ml-2 w-10">{speed.toFixed(2)}x</span>
                    </div>
                    <div className="flex items-center mb-2">
                        <span className="w-24">Reverb:</span>
                        <Slider 
                            min={0}
                            max={100}
                            step={1}
                            value={reverbAmount}
                            onChange={setReverbAmount}
                            className="flex-1"
                        />
                        <span className="ml-2 w-10">{reverbAmount}%</span>
                    </div>
                </div>
            )
        },
        nightcore: {
            label: 'Nightcore',
            icon: '✨',
            description: 'Ускорение и повышение тона для класического nightcore звучания',
            controls: (
                <div className="mt-4">
                    <div className="flex items-center mb-2">
                        <span className="w-24">Speed:</span>
                        <Slider 
                            min={1.0}
                            max={2.0}
                            step={0.1}
                            value={speed}
                            onChange={setSpeed}
                            className="flex-1"
                        />
                        <span className="ml-2 w-10">{speed.toFixed(1)}x</span>
                    </div>
                    <div className="flex items-center mb-2">
                        <span className="w-24">Pitch:</span>
                        <Slider 
                            min={-2.0}
                            max={2.0}
                            step={0.1}
                            value={pitch}
                            onChange={setPitch}
                            className="flex-1"
                        />
                        <span className="ml-2 w-10">{pitch.toFixed(1)}x</span>
                    </div>
                </div>
            )
        },
        alleffects: {
            label: 'All Effects',
            icon: '🛠️',
            description: 'Всевозможные эффекты представлены на слайдерах ниже',
            controls: (
                <div className="mt-4">
                    <div className="flex items-center mb-2">
                        <span className="w-24">Speed:</span>
                        <Slider 
                            min={0.5}
                            max={2.0}
                            step={0.1}
                            value={speed}
                            onChange={setSpeed}
                            className="flex-1"
                        />
                        <span className="ml-2 w-10">{speed.toFixed(1)}x</span>
                    </div>
                    <div className="flex items-center mb-2">
                        <span className="w-24">Pitch:</span>
                        <Slider 
                            min={-2.0}
                            max={2.0}
                            step={0.1}
                            value={pitch}
                            onChange={setPitch}
                            className="flex-1"
                        />
                        <span className="ml-2 w-10">{pitch.toFixed(1)}x</span>
                    </div>
                    <div className="flex items-center mb-2">
                        <span className="w-24">Reverb:</span>
                        <Slider 
                            min={0}
                            max={100}
                            value={reverbAmount}
                            onChange={setReverbAmount}
                            className="flex-1"
                        />
                        <span className="ml-2 w-10">{reverbAmount}%</span>
                    </div>
                    <div className="flex items-center mb-2">
                        <span className="w-24">BassBoost:</span>
                        <Slider 
                            min={-20.0}
                            max={20.0}
                            step={1}
                            value={bass_gain}
                            onChange={setBassGain}
                            className="flex-1"
                        />
                        <span className="ml-2 w-10">{bass_gain}дцБ</span>
                    </div>
                    <div className="flex items-center mb-2">
                        <span className="w-24">Flanger:</span>
                        <Slider 
                            min={0}
                            max={10.0}
                            step={0.1}
                            value={flanger_mix}
                            onChange={setFlangerMix}
                            className="flex-1"
                        />
                        <span className="ml-2 w-10">{flanger_mix*10}%</span>
                    </div>
                </div>
            )
        }
    };
    
    const currentEffect = effectSettings[effect];
    useEffect(() => {
        const token = localStorage.getItem("access_token");

        if (token) {
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        }
        const fetchHistory = async () => {
          try {
            const response = await axios.get("/api/history", {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            setHistory(response.data.history || []);
          } catch (err) {
            console.error("Ошибка получения истории:", err);
            setHistory([]);
          }
        };
      
        fetchHistory();
      }, []);
      
      const sortedHistory = [...history].sort(
        (a, b) => new Date(b.processed_at) - new Date(a.processed_at)
      );
    
    return (
        <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
            <div className="flex">
                {/* Левая панель */}
                <div className={`w-64 h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
                <h2 className="text-xl font-semibold mb-4">📂 История</h2>
                <ul className="space-y-2 text-sm overflow-y-auto flex-1 pr-1">
                    {sortedHistory.map((item, index) => (
                    <li key={index} className="hover:bg-gray-100 p-2 rounded cursor-pointer">
                        <div className="font-medium">{item.processed_filename || "Имя обработанного файла"}</div>
                        <div className="text-gray-500 text-xs">
                        {new Date(item.processed_at).toLocaleString('ru-RU')}
                        </div>
                        <button
  className="mt-1 text-blue-600 hover:underline text-xs"
  onClick={async () => {
    try {
        const token = localStorage.getItem("access_token");

        if (!token) {
            alert("Вы не авторизованы");
            return;
        }

        const res = await fetch(
            `/api/history-download-link?filename=${encodeURIComponent(item.processed_filename)}`,
            {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            }
        );

        if (!res.ok) throw new Error("Не удалось получить ссылку");

        const data = await res.json();

        window.location.href = `/api/temp-download/${data.token}`;
    } catch (e) {
        alert("Ошибка при скачивании");
    }
    }}
    >
    Скачать
    </button>

                    </li>
                    ))}
                </ul>
                </div>
                <div className="flex-1 container mx-auto px-4 py-8">
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold gradient-text"><a href="/">AudioFX</a></h1>
                    <Switch 
                        checkedChildren="🌙" 
                        unCheckedChildren="☀️" 
                        checked={darkMode}
                        onChange={setDarkMode}
                    />
                </div>
                
                <p className="text-lg mb-8">
                Преобразуйте свои аудиофайлы с помощью профессиональных эффектов. Загрузите файл, выберите эффект,
настройте параметры и получите результат.
                </p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <Card 
                        title="Исходное аудио:" 
                        className={`audio-card ${darkMode ? 'bg-gray-800' : ''}`}
                        extra={
                            <Space>
                                <Button 
                                    onClick={handlePreviewPlay}
                                    disabled={!previewUrl}
                                    icon={<span>▶️</span>}
                                >
                                    Play
                                </Button>
                                <Button 
                                onClick={handlePreviewPause}
                                disabled={!previewUrl}
                                icon={<span>⏸️
                                    </span>}
                            >
                                Pause
                            </Button>
                            <Slider 
                                min={0}
                                max={100}
                                value={originalVolume}
                                onChange={handleOriginalVolume}
                                className="w-24 ml-2"
                                tooltipVisible={false}
                            />
                        </Space>
                            
                        }
                    >
                        <Dragger 
                            name="file"
                            accept="audio/*"
                            beforeUpload={beforeUpload}
                            showUploadList={false}
                            className={`${darkMode ? 'bg-gray-700' : ''}`}
                        >
                            {fileId ? (
                                <div className="p-4">
                                    <p className="text-lg font-semibold">{file.name}</p>
                                    <p className="text-sm">{formatTime(audioDuration)} • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    <div className="waveform mt-4"></div>
                                    <div className="flex justify-between mt-2 text-sm">
                                        <span>{formatTime(currentTime)}</span>
                                        <span>{formatTime(audioDuration)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-8 text-center">
                                    <p className="text-4xl mb-4">🎵</p>
                                    <p className="text-lg">Щелкните или перетащите аудиофайл в эту область для загрузки</p>
                                    <p className="text-sm text-gray-500 mt-2">Поддержка формата MP3, WAV, OGG, etc.</p>
                                </div>
                            )}
                        </Dragger>
                        
                        <audio 
                            ref={previewAudioRef}
                            src={previewUrl}
                            onTimeUpdate={handleTimeUpdate}
                            hidden
                        />
                    </Card>
                    
                    <Card 
                        title="Обработанное аудио:" 
                        className={`audio-card ${darkMode ? 'bg-gray-800' : ''}`}
                        extra={
                            <Space>
                                <Button 
                                    onClick={handleProcessedPlay}
                                    disabled={!processedUrl}
                                    icon={<span>▶️</span>}
                                >
                                    Play
                                </Button>
                                <Button 
                                onClick={handleProcessedPause}
                                disabled={!processedUrl}
                                icon={<span>⏸️
                                    </span>}
                            >
                                Pause
                            </Button>
                                <Button 
                                    type="primary" 
                                    onClick={handleDownload}
                                    disabled={!processedUrl}
                                    icon={<span>💾</span>}
                                >
                                    Download
                                </Button>
                                <Slider 
                                    min={0}
                                    max={100}
                                    value={processedVolume}
                                    onChange={handleProcessedVolume}
                                    className="w-24"
                                    tooltipVisible={false}
                                />
                            </Space>
                        }
                    >
                        {processedUrl ? (
                            <div className="p-4">
                                <p className="text-lg font-semibold">{file.name}_processed</p>
                                <div className="waveform mt-4"></div>
                                <div className="flex justify-between mt-2 text-sm">
                                    <span>0:00</span>
                                    <span>{formatTime(audioDuration / speed)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center">
                                <p className="text-4xl mb-4">🎧</p>
                                <p className="text-lg">Обработанный аудиофайл появиться здесь...</p>
                                <p className="text-sm text-gray-500 mt-2">Сначал примените эффекты аудиофайлу</p>
                            </div>
                        )}
                        
                        {processing && (
                            <div className="mt-4">
                                <p className="text-center mt-2">Обработка аудио...</p>
                            </div>
                        )}
                        
                        <audio 
                            key={audioKey} 
                            ref={audioRef}
                            src={processedUrl}
                            hidden
                        />
                    </Card>
                </div>
                
                <Card title="Аудиоэффекты" className={`${darkMode ? 'bg-gray-800' : ''}`}>
                    <Radio.Group 
                        value={effect} 
                        onChange={(e) => setEffect(e.target.value)}
                        buttonStyle="solid"
                        className="w-full mb-6"
                        size='large'
                    >
                        <Space direction="vertical" className="w-full">
                            {Object.entries(effectSettings).map(([key, config]) => (
                                <Radio.Button 
                                    value={key} 
                                    key={key}
                                    className={`w-full h-10 text-left p-4 rounded-lg ${effect === key ? 'border-blue-500 border-2' : ''}`}
                                >
                                    <div className="flex items-center">
                                        <span className="text-2xl mr-4 p-1">{config.icon}</span>
                                        <div>
                                            <h3 className="text-lg font-semibold">{config.label}</h3>
                                            {/* <p className="text-sm text-gray-500">{config.description}</p> */}
                                        </div>
                                    </div>
                                </Radio.Button>
                            ))}
                        </Space>
                    </Radio.Group>
                    
                    <Divider />
                    
                    <h3 className="text-xl font-semibold mb-4">{currentEffect.label} Параметры</h3>
                    {currentEffect.controls}
                    
                    <div className="flex items-center mb-4 mt-6">
                        <span className="w-24">Volume:</span>
                        <Slider 
                            min={0}
                            max={1}
                            step={0.1}
                            value={volume}
                            onChange={setVolume}
                            className="flex-1"
                        />
                        <span className="ml-2 w-10">{volume*100}%</span>
                    </div>
                    
                    <Button 
                        type="primary" 
                        size="large" 
                        onClick={handleProcess}
                        loading={processing}
                        disabled={!fileId}
                        block
                        icon={<span>⚡</span>}
                    >
                        {processing ? 'Обработка...' : 'Применить эффекты'}
                    </Button>
                </Card>
            </div>
            
        </div>
        </div>
        </div>
    );
};
export default AudioFXProcessor; 