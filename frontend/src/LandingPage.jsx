import React, { useState, useEffect } from 'react';
import {
  Layout,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Modal,
  Form,
  Input,
  Space,
  message
} from 'antd';
import {
  RocketOutlined,
  CloudDownloadOutlined,
  AudioOutlined,
  UserAddOutlined,
  LoginOutlined,
  PlayCircleOutlined,
  UploadOutlined
} from '@ant-design/icons';
import 'antd/';
import 'animate.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Header, Content, Footer } = Layout;
const { Title, Paragraph } = Typography;

export default function LandingPage() {
  const [isAuthModalVisible, setAuthModalVisible] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const showAuthModal = (mode) => {
    setAuthMode(mode);
    setAuthModalVisible(true);
  };

  const closeAuthModal = () => setAuthModalVisible(false);
  
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setIsAuthenticated(false);
  };
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const response = await axios.post(`/api/${authMode}`, values);
      const token = response.data.access_token;

      localStorage.setItem('access_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      message.success('Успешно!');
      closeAuthModal();
      navigate('/app');
    } catch (error) {
      const detail = error?.response?.data?.detail;

      if (authMode === 'login' && detail === 'Invalid credentials') {
        form.setFields([
          {
            name: 'password',
            errors: ['Неверный логин или пароль']
          }
        ]);
        return;
      }

      if (authMode === 'register' && detail === 'User already exists') {
        form.setFields([
          {
            name: 'username',
            errors: ['Пользователь с таким именем уже существует']
          }
        ]);
        return;
      }

      message.error(detail || 'Ошибка входа/регистрации');
    }
  };

  const features = [
    {
      icon: <RocketOutlined className="text-4xl text-blue-500" />,
      title: 'Ускорение и замедление',
      desc: 'Изменяйте скорость воспроизведения без потери качества и изменения тона.'
    },
    {
      icon: <CloudDownloadOutlined className="text-4xl text-indigo-500" />,
      title: 'Эффекты реверберации',
      desc: 'Добавляйте атмосферный ревербератор для создания глубины и пространства.'
    },
    {
      icon: <AudioOutlined className="text-4xl text-purple-500" />,
      title: 'Nightcore',
      desc: 'Поднимайте тональность и скорость для классического Nightcore-эффекта.'
    },
    {
      icon: <UserAddOutlined className="text-4xl text-pink-500" />,
      title: 'Аккаунт и история',
      desc: 'Регистрируйтесь, чтобы сохранять историю обработки и скачивать файлы в течение часа.'
    }
  ];

  const steps = [
    {
      title: '1. Загрузите файл',
      content: 'Поддержка MP3, WAV, OGG и других форматов.',
      icon: <UploadOutlined className="text-2xl" />
    },
    {
      title: '2. Выберите эффект',
      content: 'Speed, Reverb, Nightcore — и многое другое.',
      icon: <PlayCircleOutlined className="text-2xl" />
    },
    {
      title: '3. Скачайте готовый трек',
      content: 'Получите аудио сразу после обработки.',
      icon: <CloudDownloadOutlined className="text-2xl" />
    }
  ];

  return (
    <Layout className="min-h-screen">
      <Header className="bg-gradient-to-r from-blue-500 to-indigo-600 fixed w-full z-10 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md">
              <RocketOutlined className="text-blue-500 text-xl" />
            </div>
            <Title level={3} className="text-white m-auto" />
          </div>
          <Space>
            {isAuthenticated ? (
              <>
                <Button
                  ghost
                  className="text-white border-white hover:bg-white/10"
                  onClick={() => navigate('/app')}
                >
                  Перейти в приложение
                </Button>
                <Button
                  danger
                  ghost
                  className="text-white border-white hover:bg-red-600/20"
                  onClick={handleLogout}
                >
                  Выйти
                </Button>
              </>
            ) : (
              <>
                <Button
                  ghost
                  className="text-white border-white hover:bg-white/10"
                  onClick={() => showAuthModal('login')}
                  icon={<LoginOutlined />}
                >
                  Войти
                </Button>
                <Button
                  type="primary"
                  className="bg-white text-blue-600 hover:bg-gray-100 shadow-md"
                  icon={<UserAddOutlined />}
                  onClick={() => showAuthModal('register')}
                >
                  Регистрация
                </Button>
              </>
            )}
          </Space>
        </div>
      </Header>

      <Content className="pt-24 pb-16 bg-gray-50 mt-16 w-full">
        <div className="max-w-7xl mx-auto text-center space-y-6 animate__animated animate__fadeIn">
          <Title level={1} className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight">
            <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-transparent bg-clip-text">Преобразуйте</span> свои аудиофайлы профессионально
          </Title>
          <Paragraph className="text-lg text-gray-600 max-w-3xl mx-auto">
            Загрузите файл, выберите эффект и настройте параметры — всё через простой интерфейс. Получите результат за секунды.
          </Paragraph>
          <Space>
            <Button type="primary" size="large" className="h-12 px-8 text-lg font-medium" onClick={() => showAuthModal('register')}>
              Начать бесплатно
            </Button>
          </Space>
        </div>
      </Content>

      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Title level={2} className="text-center mb-4">Наши возможности</Title>
          <Paragraph className="text-center text-gray-600 max-w-2xl mx-auto mb-12">
            AudioFX предлагает мощные инструменты для обработки аудио с простым и интуитивным интерфейсом.
          </Paragraph>
          <Row gutter={[24, 24]}>
            {features.map((feature, idx) => (
              <Col key={idx} xs={24} sm={12} lg={6}>
                <Card bordered={false} hoverable className="text-center feature-card p-6">
                  <div className="mb-6 flex justify-center">{feature.icon}</div>
                  <Title level={4} className="mb-3">{feature.title}</Title>
                  <Paragraph className="text-gray-500">{feature.desc}</Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Title level={2} className="text-center mb-4">Как это работает</Title>
          <Paragraph className="text-center text-gray-600 max-w-2xl mx-auto mb-12">
            Всего три простых шага отделяют вас от профессионально обработанного аудио
          </Paragraph>
          <Row gutter={[32, 32]}>
            {steps.map((step, idx) => (
              <Col key={idx} xs={24} md={8}>
                <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 text-blue-500">
                    {step.icon}
                  </div>
                  <Title level={4} className="mb-2">{step.title}</Title>
                  <Paragraph className="text-gray-600">{step.content}</Paragraph>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      <div className="py-16 bg-gradient-to-r from-blue-500 to-indigo-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <Title level={2} className="text-white mb-6">Готовы преобразовать свои аудиофайлы?</Title>
          <Paragraph className="text-blue-100 mb-8 text-lg">
            Присоединяйтесь к тысячам пользователей, которые уже используют AudioFX для профессиональной обработки звука.
          </Paragraph>
          <Button
            type="primary"
            size="large"
            className="h-12 px-8 text-lg font-medium bg-white text-blue-600 hover:bg-gray-100 shadow-xl"
            onClick={() => showAuthModal('register')}
          >
            Начать бесплатно
          </Button>
        </div>
      </div>

      <Footer className="text-center bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center mb-6">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
              <RocketOutlined className="text-white text-lg" />
            </div>
          </div>
          <Title level={4} className="mb-2">AudioFX</Title>
          <Paragraph className="text-gray-600 mb-6">
            Профессиональная обработка аудио для всех
          </Paragraph>
        </div>
      </Footer>

      <Modal
        title={
          <Title level={3} className="text-center mb-0">
            {authMode === 'login' ? 'Вход в аккаунт' : 'Регистрация'}
          </Title>
        }
        visible={isAuthModalVisible}
        onCancel={closeAuthModal}
        footer={null}
        centered
        width={400}
      >
        <Form layout="vertical" form={form} className="px-2">
          {(authMode === 'login' || authMode === 'register') && (
            <Form.Item
              label="Имя пользователя"
              name="username"
              rules={[
                { required: true, message: 'Пожалуйста, введите имя пользователя' },
                { min: 3, max: 20, message: 'Имя пользователя должно быть от 3 до 20 символов' },
                {
                  pattern: /^[a-zA-Z0-9_-]+$/,
                  message: 'Разрешены только латинские буквы, цифры, дефис и подчёркивание'
                }
              ]}
            >
              <Input size="large" placeholder="Ваше имя" />
            </Form.Item>
          )}

          {authMode === 'register' && (
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Пожалуйста, введите email' },
                { type: 'email', message: 'Пожалуйста, введите корректный email' },
                { pattern: /^\S+$/, message: 'Email не должен содержать пробелов' }
              ]}
            >
              <Input size="large" placeholder="example@email.com" />
            </Form.Item>
          )}

          <Form.Item
            label="Пароль"
            name="password"
            rules={[
              { required: true, message: 'Пожалуйста, введите пароль' },
              { min: 6, message: 'Пароль должен содержать минимум 6 символов' },
              { pattern: /^\S+$/, message: 'Пароль не должен содержать пробелов' }
            ]}
          >
            <Input.Password size="large" placeholder="••••••••" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              onClick={handleSubmit}
              className="h-12"
            >
              {authMode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </Button>
          </Form.Item>

          <div className="text-center">
            {authMode === 'login' ? (
              <span>
                Нет аккаунта?{' '}
                <Button type="link" className="p-0" onClick={() => setAuthMode('register')}>
                  Зарегистрироваться
                </Button>
              </span>
            ) : (
              <span>
                Уже есть аккаунт?{' '}
                <Button type="link" className="p-0" onClick={() => setAuthMode('login')}>
                  Войти
                </Button>
              </span>
            )}
          </div>
        </Form>
      </Modal>
    </Layout>
  );
}
