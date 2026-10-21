import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Upload, FileText, X, Clock, AlertCircle, Trash2, RefreshCw, CheckCircle2, Circle, Send } from 'lucide-react';
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
import { agentAPI, formatApiError } from '../../utils/api';
import AgentActivationStatus from './AgentActivationStatus';
import { getOnboardingStatus, isLockedForReview, getDocChecklist, DOC_TYPE_OPTIONS } from '../../utils/onboarding';

const ComplianceStatus = () => {
  const { user, updateUser } = useAuth();
  const { uploadVerificationDocument, deleteVerificationDocument } = useData();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('');

  const documents = user?.verificationDocuments || [];
  const isVerified = user?.isVerified;
  const locked = isLockedForReview(user);
  const status = getOnboardingStatus(user);
  const checklist = getDocChecklist(user);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [declaration, setDeclaration] = useState({ declarationName: '', declarationIdNumber: '' });
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  if (isVerified) return <AgentActivationStatus />;

  const canSubmit = ['draft', 'correction_required'].includes(user?.onboardingStatus);
  // Agents created without an invite link have not signed the declaration yet
  const needsDeclaration = canSubmit && !user?.declarationAcceptedAt;

  const handleSignDeclaration = async () => {
    setIsSigning(true);
    try {
      const res = await agentAPI.acceptDeclaration({ ...declaration, declarationAccepted: declarationAccepted });
      updateUser(res.data);
      toast.success('Declaration signed');
    } catch (error) {
      toast.error('Could not sign the declaration', { description: formatApiError(error) });
    } finally {
      setIsSigning(false);
    }
  };

  const handleSubmitForReview = async () => {
    setIsSubmitting(true);
    try {
      const res = await agentAPI.submitOnboarding();
      updateUser(res.data);
      toast.success('Application submitted', { description: 'Our recruitment team will review it shortly.' });
    } catch (error) {
      toast.error('Could not submit application', { description: formatApiError(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    setIsDeleting(docId);
    try {
      const updatedUser = await deleteVerificationDocument(docId);
      updateUser(updatedUser);
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleReupload = (type) => {
    setDocType(type);
    setShowUpload(true);
    // Scroll to upload section if needed, but it's usually visible
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
                  : locked
                    ? 'Your application is with our recruitment team. We will notify you of the outcome.'
                    : 'Action Required: upload your documents and submit your application for review.'}
              </CardDescription>
            </div>
          </div>
          <Badge className={`border-none ${status.style}`}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {user?.onboardingStatus === 'correction_required' && user?.verificationRemarks && (
            <div className="text-sm bg-orange-50 border border-orange-200 text-orange-900 p-3 rounded-lg">
              <span className="font-semibold">Changes requested: </span>{user.verificationRemarks}
            </div>
          )}
          {user?.onboardingStatus === 'rejected' && (
            <div className="text-sm bg-red-50 border border-red-200 text-red-900 p-3 rounded-lg">
              <span className="font-semibold">Application rejected. </span>{user.verificationRemarks}
            </div>
          )}

          {/* Required documents checklist */}
          {checklist.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Required documents</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {checklist.map(({ type, doc }) => (
                  <li key={type} className="flex items-center gap-2 text-sm">
                    {doc ? <CheckCircle2 className={`w-4 h-4 ${doc.status === 'approved' ? 'text-emerald-600' : doc.status === 'rejected' ? 'text-red-500' : 'text-amber-500'}`} />
                      : <Circle className="w-4 h-4 text-muted-foreground" />}
                    <span>{type}</span>
                    {doc && <span className="text-xs text-muted-foreground">· {doc.status}</span>}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">All documents in English, scanned as PDF.</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Choose your agent type under Settings → Application Details to see which documents are required.
            </p>
          )}

          {needsDeclaration && (
            <div className="p-4 border rounded-lg bg-muted/20 space-y-3" data-testid="declaration-form">
              <h4 className="text-sm font-semibold">Declaration</h4>
              <p className="text-sm text-muted-foreground">
                I declare that the information given in this application and the documents submitted are true and
                complete, and I agree to the terms of QStudy's agent programme. This can only be signed once.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="declarationName">Signature (type your full name)</Label>
                  <Input
                    id="declarationName"
                    value={declaration.declarationName}
                    onChange={(e) => setDeclaration({ ...declaration, declarationName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="declarationIdNumber">ID number</Label>
                  <Input
                    id="declarationIdNumber"
                    value={declaration.declarationIdNumber}
                    onChange={(e) => setDeclaration({ ...declaration, declarationIdNumber: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={declarationAccepted}
                  onChange={(e) => setDeclarationAccepted(e.target.checked)}
                />
                <span>I have read and accept the declaration above.</span>
              </label>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSignDeclaration}
                  disabled={isSigning || !declarationAccepted || !declaration.declarationName.trim() || !declaration.declarationIdNumber.trim()}
                >
                  {isSigning ? 'Signing...' : 'Sign declaration'}
                </Button>
              </div>
            </div>
          )}



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
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(doc.status)}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 ml-2 border-l pl-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-white"
                        onClick={() => handleReupload(doc.docType)}
                        disabled={locked}
                        title="Re-upload"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(doc._id)}
                        disabled={locked || isDeleting === doc._id}
                        title="Delete"
                      >
                        {isDeleting === doc._id ? (
                          <Clock className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}


          {/* Upload Section */}
          {locked ? null : !showUpload ? (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => {
                setDocType('');
                setShowUpload(true);
              }}
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
                      {DOC_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
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

          {canSubmit && (
            <Button className="w-full" onClick={handleSubmitForReview} disabled={isSubmitting || needsDeclaration}>
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Submitting...' : user?.onboardingStatus === 'correction_required' ? 'Resubmit for review' : 'Submit application for review'}
            </Button>
          )}

        </div>
      </CardContent>
    </Card>
  );
};

export default ComplianceStatus;
