import React, { useState, useEffect } from 'react';
import { Plus, Smartphone, RefreshCw, LogOut, Trash2 } from 'lucide-react';
import { evolutionApi } from '../services/api';
import { Instance } from '../types/instance';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

function Instances() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewInstanceModal, setShowNewInstanceModal] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');

  const fetchInstances = async () => {
    try {
      const response = await evolutionApi.getInstances();
      setInstances(response.data);
    } catch (error) {
      toast.error('Failed to fetch instances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await evolutionApi.createInstance(newInstanceName);
      toast.success('Instance created successfully');
      setShowNewInstanceModal(false);
      setNewInstanceName('');
      fetchInstances();
    } catch (error) {
      toast.error('Failed to create instance');
    }
  };

  const handleConnect = async (instanceName: string) => {
    try {
      await evolutionApi.connectInstance(instanceName);
      toast.success('Connection initiated');
      fetchInstances();
    } catch (error) {
      toast.error('Failed to connect instance');
    }
  };

  const handleLogout = async (instanceName: string) => {
    try {
      await evolutionApi.logoutInstance(instanceName);
      toast.success('Instance logged out successfully');
      fetchInstances();
    } catch (error) {
      toast.error('Failed to logout instance');
    }
  };

  const handleDelete = async (instanceName: string) => {
    if (window.confirm('Are you sure you want to delete this instance?')) {
      try {
        await evolutionApi.deleteInstance(instanceName);
        toast.success('Instance deleted successfully');
        fetchInstances();
      } catch (error) {
        toast.error('Failed to delete instance');
      }
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp Instances</h1>
        <button
          onClick={() => setShowNewInstanceModal(true)}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Instance
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {instances.map((instance) => (
          <div
            key={instance.id}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {instance.profilePictureUrl ? (
                  <img
                    src={instance.profilePictureUrl}
                    alt={instance.profileName}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-gray-500" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold">{instance.name}</h3>
                  <p className="text-sm text-gray-500">{instance.number}</p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  instance.connectionStatus === 'open'
                    ? 'bg-green-100 text-green-800'
                    : instance.connectionStatus === 'connecting'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {instance.connectionStatus}
              </span>
            </div>

            {instance.profileName && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">Profile: {instance.profileName}</p>
              </div>
            )}

            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-3 gap-4 text-center text-sm text-gray-600 mb-4">
                <div>
                  <p className="font-semibold">{instance._count.Message}</p>
                  <p>Messages</p>
                </div>
                <div>
                  <p className="font-semibold">{instance._count.Contact}</p>
                  <p>Contacts</p>
                </div>
                <div>
                  <p className="font-semibold">{instance._count.Chat}</p>
                  <p>Chats</p>
                </div>
              </div>
            </div>

            {instance.qrcode && instance.connectionStatus === 'connecting' && (
              <div className="mb-4">
                <img
                  src={`data:image/png;base64,${instance.qrcode}`}
                  alt="QR Code"
                  className="w-full"
                />
                <p className="text-sm text-gray-600 text-center mt-2">
                  Scan this QR code with WhatsApp
                </p>
              </div>
            )}

            <div className="flex space-x-2">
              {instance.connectionStatus === 'closed' ? (
                <button
                  onClick={() => handleConnect(instance.name)}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Connect
                </button>
              ) : (
                <button
                  onClick={() => handleLogout(instance.name)}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              )}
              <button
                onClick={() => handleDelete(instance.name)}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Instance Modal */}
      {showNewInstanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Instance</h2>
            <form onSubmit={handleCreateInstance}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instance Name
                </label>
                <input
                  type="text"
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter instance name"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewInstanceModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Instances;