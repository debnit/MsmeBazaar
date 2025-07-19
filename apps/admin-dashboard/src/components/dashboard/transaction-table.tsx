'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Edit
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '../../../libs/ui/components/ui/card'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../../libs/ui/components/ui/table'
import { api } from '@/lib/api'
import { formatCurrency, formatNumber, debounce } from '../../../libs/ui/lib/utils'
import { Transaction, TableFilters } from '@/types/dashboard'
import { format } from 'date-fns'

interface TransactionTableProps {
  className?: string
}

function StatusBadge({ status }: { status: Transaction['dealStatus'] }) {
  const statusConfig = {
    pending: 'status-badge bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    approved: 'status-badge bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    completed: 'status-badge bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    rejected: 'status-badge bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    cancelled: 'status-badge bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
  }

  return (
    <span className={statusConfig[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function TypeBadge({ type }: { type: Transaction['type'] }) {
  const typeConfig = {
    loan: 'bg-blue-50 text-blue-700 border-blue-200',
    investment: 'bg-green-50 text-green-700 border-green-200',
    grant: 'bg-purple-50 text-purple-700 border-purple-200',
    valuation: 'bg-orange-50 text-orange-700 border-orange-200',
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${typeConfig[type]}`}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  )
}

export function TransactionTable({ className }: TransactionTableProps) {
  const [filters, setFilters] = useState<TableFilters>({
    search: '',
    region: '',
    status: '',
    sortBy: 'date',
    sortOrder: 'desc',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((searchTerm: string) => {
      setFilters(prev => ({ ...prev, search: searchTerm }))
      setCurrentPage(1)
    }, 300),
    []
  )

  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', filters, currentPage, pageSize],
    queryFn: () => api.getTransactions(filters, { page: currentPage, pageSize }),
  })

  const transactions = data?.data || []
  const pagination = data?.pagination

  const handleSort = (column: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      const blob = await api.exportTransactions(format, filters)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `transactions.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const SortButton = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <button
      className="flex items-center gap-1 hover:text-foreground"
      onClick={() => handleSort(column)}
    >
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  )

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            Failed to load transactions. Please try again.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transaction Overview</CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search transactions..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
          
          <select
            value={filters.region || ''}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, region: e.target.value }))
              setCurrentPage(1)
            }}
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
            onChange={(e) => {
              setFilters(prev => ({ ...prev, status: e.target.value }))
              setCurrentPage(1)
            }}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>
                  <SortButton column="msme">MSME Name</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton column="status">Deal Status</SortButton>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>
                  <SortButton column="amount">Amount</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton column="date">Date</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton column="region">Region</SortButton>
                </TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><div className="skeleton h-4 w-32 rounded" /></TableCell>
                    <TableCell><div className="skeleton h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><div className="skeleton h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><div className="skeleton h-4 w-24 rounded" /></TableCell>
                    <TableCell><div className="skeleton h-4 w-20 rounded" /></TableCell>
                    <TableCell><div className="skeleton h-4 w-16 rounded" /></TableCell>
                    <TableCell><div className="skeleton h-4 w-20 rounded" /></TableCell>
                    <TableCell><div className="skeleton h-8 w-8 rounded" /></TableCell>
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div>
                        <p className="font-medium">{transaction.msme.businessName}</p>
                        <p className="text-sm text-muted-foreground">{transaction.msme.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={transaction.dealStatus} />
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={transaction.type} />
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(transaction.date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{transaction.region}</TableCell>
                    <TableCell>{transaction.agentName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button className="p-1 hover:bg-accent rounded">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="p-1 hover:bg-accent rounded">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="p-1 hover:bg-accent rounded">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total} transactions
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
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