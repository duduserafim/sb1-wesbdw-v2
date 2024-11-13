import React, { useState, useEffect, useRef } from 'react';
import { evolutionApi } from '../services/api';
import { ScheduledMessage, CreateScheduleData } from '../types/schedule';
import { Chat } from '../types/chat';
import { toast } from 'react-toastify';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  MessageSquare,
  RepeatIcon,
  FileIcon,
  Image as ImageIcon,
  Video,
  Mic,
  Send,
  Users,
  AtSign
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { format, parseISO } from 'date-fns';

type MessageType = 'text' | 'text-mention' | 'image' | 'audio' | 'video' | 'document';

interface FileUpload {
  file: File;
  url?: string;
  uploading: boolean;
  progress: number;
}

function Schedule() {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<ScheduledMessage[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState('');
  const [instances, setInstances] = useState<string[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [messageType, setMessageType] = useState<MessageType>('text');
  const [fileUpload, setFileUpload] = useState<FileUpload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newSchedule, setNewSchedule] = useState<CreateScheduleData>({
    instanceName: '',
    chatId: '',
    content: '',
    type: 'text',
    scheduledTime: '',
    repeat: 'none',
  });

  useEffect(() => {
    fetchInstances();
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (selectedInstance) {
      fetchChats();
    }
  }, [selectedInstance]);

  const fetchInstances = async () => {
    try {
      const response = await evolutionApi.getInstances();
      const connectedInstances = response.data
        .filter((instance: any) => instance.status === 'connected')
        .map((instance: any) => instance.instanceName);
      setInstances(connectedInstances);
      if (connectedInstances.length > 0) {
        setSelectedInstance(connectedInstances[0]);
      }
    } catch (error) {
      toast.error('Failed to fetch instances');
    }
  };

  const fetchChats = async () => {
    try {
      const response = await evolutionApi.getChats(selectedInstance);
      const groups = response.data.filter((chat: Chat) => chat.isGroup);
      setChats(groups);
    } catch (error) {
      toast.error('Failed to fetch groups');
    }
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const response = await evolutionApi.getSchedules();
      setSchedules(response.data);
    } catch (error) {
      toast.error('Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileUpload({
      file,
      uploading: true,
      progress: 0,
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await evolutionApi.uploadFile(selectedInstance, '', formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 0)
          );
          setFileUpload((prev) =>
            prev ? { ...prev, progress } : null
          );
        },
      });

      setFileUpload((prev) =>
        prev ? { ...prev, uploading: false, url: response.data.url } : null
      );
    } catch (error) {
      toast.error('Failed to upload file');
      setFileUpload(null);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    const schedulePromises = selectedGroups.map(async (groupId) => {
      const scheduleData = {
        ...newSchedule,
        instanceName: selectedInstance,
        chatId: groupId,
        type: messageType,
        fileUrl: fileUpload?.url,
        fileName: fileUpload?.file.name,
      };

      if (messageType === 'text-mention') {
        scheduleData.options = { mentions: { everyOne: true } };
      }

      try {
        await evolutionApi.createSchedule(scheduleData);
        return true;
      } catch {
        return false;
      }
    });

    const results = await Promise.all(schedulePromises);
    const successCount = results.filter(Boolean).length;

    if (successCount > 0) {
      toast.success(`Schedule created for ${successCount} group(s)`);
      setShowCreateModal(false);
      resetForm();
      fetchSchedules();
    } else {
      toast.error('Failed to create schedule');
    }
  };

  const handleSendNow = async () => {
    const sendPromises = selectedGroups.map(async (groupId) => {
      try {
        if (messageType === 'text' || messageType === 'text-mention') {
          await evolutionApi.sendMessage(selectedInstance, groupId, {
            content: newSchedule.content,
            options: messageType === 'text-mention' ? { mentions: { everyOne: true } } : undefined,
          });
        } else if (fileUpload?.url) {
          await evolutionApi.sendFile(
            selectedInstance,
            groupId,
            fileUpload.url,
            newSchedule.content // caption
          );
        }
        return true;
      } catch {
        return false;
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(Boolean).length;

    if (successCount > 0) {
      toast.success(`Message sent to ${successCount} group(s)`);
      setShowCreateModal(false);
      resetForm();
    } else {
      toast.error('Failed to send message');
    }
  };

  const resetForm = () => {
    setNewSchedule({
      instanceName: selectedInstance,
      chatId: '',
      content: '',
      type: 'text',
      scheduledTime: '',
      repeat: 'none',
    });
    setMessageType('text');
    setFileUpload(null);
    setSelectedGroups([]);
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await evolutionApi.deleteSchedule(id);
      toast.success('Schedule deleted successfully');
      fetchSchedules();
    } catch (error) {
      toast.error('Failed to delete schedule');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Scheduled Messages</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Schedule
        </button>
      </div>

      {/* Schedules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schedules.map((schedule) => (
          <div key={schedule.id} className="bg-white rounded-lg shadow-md p-6">
            {/* ... (existing schedule card content) ... */}
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New Schedule</h2>
            <form onSubmit={handleCreateSchedule}>
              <div className="space-y-4">
                {/* Instance Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instance
                  </label>
                  <select
                    value={selectedInstance}
                    onChange={(e) => setSelectedInstance(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select Instance</option>
                    {instances.map((instance) => (
                      <option key={instance} value={instance}>
                        {instance}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Groups Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Groups
                  </label>
                  <div className="border border-gray-300 rounded-md p-4 max-h-48 overflow-y-auto">
                    {chats.map((chat) => (
                      <div key={chat.id} className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id={`group-${chat.id}`}
                          checked={selectedGroups.includes(chat.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGroups([...selectedGroups, chat.id]);
                            } else {
                              setSelectedGroups(selectedGroups.filter(id => id !== chat.id));
                            }
                          }}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor={`group-${chat.id}`}
                          className="ml-2 block text-sm text-gray-900"
                        >
                          {chat.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMessageType('text')}
                      className={`flex items-center justify-center px-4 py-2 rounded-md ${
                        messageType === 'text'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessageType('text-mention')}
                      className={`flex items-center justify-center px-4 py-2 rounded-md ${
                        messageType === 'text-mention'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <AtSign className="w-4 h-4 mr-2" />
                      Mention All
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMessageType('image');
                        fileInputRef.current?.click();
                      }}
                      className={`flex items-center justify-center px-4 py-2 rounded-md ${
                        messageType === 'image'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Image
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMessageType('audio');
                        fileInputRef.current?.click();
                      }}
                      className={`flex items-center justify-center px-4 py-2 rounded-md ${
                        messageType === 'audio'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      Audio
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMessageType('video');
                        fileInputRef.current?.click();
                      }}
                      className={`flex items-center justify-center px-4 py-2 rounded-md ${
                        messageType === 'video'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Video
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMessageType('document');
                        fileInputRef.current?.click();
                      }}
                      className={`flex items-center justify-center px-4 py-2 rounded-md ${
                        messageType === 'document'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <FileIcon className="w-4 h-4 mr-2" />
                      Document
                    </button>
                  </div>
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept={
                    messageType === 'image'
                      ? 'image/*'
                      : messageType === 'audio'
                      ? 'audio/*'
                      : messageType === 'video'
                      ? 'video/*'
                      : '*/*'
                  }
                  className="hidden"
                />

                {/* File Upload Progress */}
                {fileUpload && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {fileUpload.file.name}
                      </span>
                      {fileUpload.uploading ? (
                        <span className="text-sm text-gray-500">
                          {fileUpload.progress}%
                        </span>
                      ) : (
                        <span className="text-sm text-green-600">Uploaded</span>
                      )}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${fileUpload.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Message Content */}
                {(messageType === 'text' || messageType === 'text-mention' || 
                  (messageType !== 'audio' && fileUpload)) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {messageType === 'text' || messageType === 'text-mention'
                        ? 'Message'
                        : 'Caption'}
                    </label>
                    <textarea
                      value={newSchedule.content}
                      onChange={(e) =>
                        setNewSchedule({ ...newSchedule, content: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={4}
                      required={messageType === 'text' || messageType === 'text-mention'}
                    />
                  </div>
                )}

                {/* Schedule Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newSchedule.scheduledTime}
                    onChange={(e) =>
                      setNewSchedule({
                        ...newSchedule,
                        scheduledTime: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                {/* Repeat Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Repeat
                  </label>
                  <select
                    value={newSchedule.repeat}
                    onChange={(e) =>
                      setNewSchedule({
                        ...newSchedule,
                        repeat: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="none">No Repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendNow}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={!selectedGroups.length}
                >
                  <Send className="w-4 h-4 mr-2 inline" />
                  Send Now
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  disabled={!selectedGroups.length || !newSchedule.scheduledTime}
                >
                  <Calendar className="w-4 h-4 mr-2 inline" />
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Schedule;