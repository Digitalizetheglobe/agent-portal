import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Upload, FileText, X, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { toast } from 'sonner';

const ComplianceStatus = () => {
  const { user, updateUser } = useAuth();
  const { uploadVerificationDocument } = useData();
  const [isUploading, setIsUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('');

  const documents = user?.verificationDocuments || [];
  const isVerified = user?.isVerified;

  if (isVerified) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !docType) {
      toast.error('Please select a file and document type');
      return;
    }

    setIsUploading(true);
    try {
      const updatedUser = await uploadVerificationDocument(file, docType);
      updateUser(updatedUser);
      toast.success('Document uploaded successfully. It is now pending review.');
      setFile(null);
      setDocType('');
      setShowUpload(false);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className={`border-l-4 ${isVerified ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isVerified ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
              {isVerified ? (
                <ShieldCheck className={`w-5 h-5 ${isVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg font-['Outfit']">Agent Compliance Status</CardTitle>
              <CardDescription>
                {isVerified 
                  ? 'Your account is fully verified and compliant.' 
                  : 'Action Required: Complete your verification to ensure full access.'}
              </CardDescription>
            </div>
          </div>
          <Badge variant={isVerified ? 'default' : 'outline'} className={isVerified ? 'bg-emerald-500' : ''}>
            {isVerified ? 'Verified' : 'Unverified'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Documents List */}
          {documents.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.docType}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{doc.fileName}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(doc.status)}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload Section */}
          {!showUpload ? (
            <Button 
              variant="outline" 
              className="w-full border-dashed" 
              onClick={() => setShowUpload(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload New Document
            </Button>
          ) : (
            <div className="p-4 border rounded-lg bg-muted/20 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Upload Document</h4>
                <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="docType">Document Type</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger id="docType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Identity">Identity (Passport/ID)</SelectItem>
                      <SelectItem value="Business License">Business License</SelectItem>
                      <SelectItem value="Tax ID">Tax ID</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">File</Label>
                  <Input 
                    id="file" 
                    type="file" 
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}>Cancel</Button>
                <Button 
                  size="sm" 
                  onClick={handleUpload} 
                  disabled={isUploading || !file || !docType}
                >
                  {isUploading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {!isVerified && documents.length === 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                To become a verified agent, please upload your Identity Document (Passport or National ID) and your Business License. Verified agents gain priority access to major events and student conversion bonuses.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ComplianceStatus;
