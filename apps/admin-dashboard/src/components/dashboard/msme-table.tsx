'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Download, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '../../../libs/ui/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../libs/ui/components/ui/table'
import { api } from '@/lib/api'
import { formatNumber, debounce } from '../../../libs/ui/lib/utils'
import { MSMEListing, TableFilters } from '@/types/dashboard'
import { format } from 'date-fns'

export function MSMETable() {
  const [filters, setFilters] = useState<TableFilters>({
    search: '',
    region: '',
    status: '',
    sortBy: 'signupDate',
    sortOrder: 'desc',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)

  const debouncedSearch = useMemo(
    () => debounce((searchTerm: string) => {
      setFilters(prev => ({ ...prev, search: searchTerm }))
      setCurrentPage(1)
    }, 300),
    []
  )

  const { data, isLoading, error } = useQuery({
    queryKey: ['msmes', filters, currentPage, pageSize],
    queryFn: () => api.getMSMEListings(filters, { page: currentPage, pageSize }),
  })

  const msmes = data?.data || []
  const pagination = data?.pagination

  const handleSort = (column: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }))
  }

  const StatusBadge = ({ status }: { status: MSMEListing['complianceStatus'] }) => {
    const config = {
      compliant: 'status-badge bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      pending: 'status-badge bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      'non-compliant': 'status-badge bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    }
    return <span className={config[status]}>{status.replace('-', ' ')}</span>
  }

  const OnboardingBadge = ({ step }: { step: MSMEListing['onboardingStep'] }) => {
    const config = {
      registration: 'bg-gray-100 text-gray-800',
      kyc: 'bg-blue-100 text-blue-800',
      documentation: 'bg-yellow-100 text-yellow-800',
      verification: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
    }
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config[step]}`}>
        {step.charAt(0).toUpperCase() + step.slice(1)}
      </span>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>MSME Listings</CardTitle>
          <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search MSMEs..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
          
          <select
            value={filters.region || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Regions</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Delhi">Delhi</option>
            <option value="Bangalore">Bangalore</option>
            <option value="Chennai">Chennai</option>
            <option value="Kolkata">Kolkata</option>
          </select>

          <select
            value={filters.status || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="verification">In Verification</option>
            <option value="kyc">KYC Pending</option>
            <option value="registration">Registration</option>
          </select>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>MSME ID</TableHead>
                <TableHead>Business Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Signup Date</TableHead>
                <TableHead>Compliance Status</TableHead>
                <TableHead>Valuation Score</TableHead>
                <TableHead>Onboarding Step</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><div className="skeleton h-4 w-20 rounded" /></TableCell>
                    <TableCell><div className="skeleton h-4 w-32 rounded" /></TableCell>
                    <TableCell><div className="skeleton h-4 w-24 rounded" /></TableCell>
                    <TableCell><div className="skeleton h-4 w-20 rounded" /></TableCell>
                    <TableCell><div className="skeleton h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><div className="skeleton h-4 w-12 rounded" /></TableCell>
                    <TableCell><div className="skeleton h-6 w-20 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : msmes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No MSMEs found.
                  </TableCell>
                </TableRow>
              ) : (
                msmes.map((msme) => (
                  <TableRow key={msme.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm">{msme.id}</TableCell>
                    <TableCell className="font-medium">{msme.businessName}</TableCell>
                    <TableCell>{msme.ownerName}</TableCell>
                    <TableCell>{format(new Date(msme.signupDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell><StatusBadge status={msme.complianceStatus} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{msme.valuationScore}</span>
                        <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${msme.valuationScore}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><OnboardingBadge step={msme.onboardingStep} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {pagination && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total} MSMEs
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              
              <span className="text-sm">
                Page {currentPage} of {Math.ceil(pagination.total / pageSize)}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage >= Math.ceil(pagination.total / pageSize)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}