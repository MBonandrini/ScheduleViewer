/* Schedule Studio numeric ABI 1. MIT-style licensing is NOT granted here: project-owned source.
   Pure numeric operations only. No calendars, file I/O, AI or network access. */
#define CAP 4000000
static double data[CAP];
__attribute__((visibility("default"))) double *buffer(void){return data;}
__attribute__((visibility("default"))) int capacity(void){return CAP;}
__attribute__((visibility("default"))) int api_version(void){return 1;}
static void swap(double *a,double *b){double x=*a;*a=*b;*b=x;}
static void down(double *a,int n,int i){for(;;){int k=i,l=2*i+1,r=l+1;if(l<n&&a[l]>a[k])k=l;if(r<n&&a[r]>a[k])k=r;if(k==i)return;swap(a+i,a+k);i=k;}}
/* input [n values]; output immediately after input: min,max,mean,population sd,P10,P50,P80,P90,P95 */
__attribute__((visibility("default"))) int statistics(int n){
 if(n<1||n+9>CAP)return -1;double mean=0,m2=0;
 for(int i=0;i<n;i++){double d=data[i]-mean;mean+=d/(i+1);m2+=d*(data[i]-mean);}
 for(int i=n/2-1;i>=0;i--)down(data,n,i);for(int i=n-1;i>0;i--){swap(data,data+i);down(data,i,0);}
 double *o=data+n;o[0]=data[0];o[1]=data[n-1];o[2]=mean;o[3]=__builtin_sqrt(m2/n);
 int ps[]={10,50,80,90,95};for(int j=0;j<5;j++)o[4+j]=data[(int)((n-1)*ps[j]/100.0+0.5)];return 0;
}
/* input old[n],new[n], output differences[n]. Units are caller-defined and unchanged. */
__attribute__((visibility("default"))) int deltas(int n){if(n<0||3*n>CAP)return -1;for(int i=0;i<n;i++)data[2*n+i]=data[n+i]-data[i];return 0;}
/* input duration[n], edges[m*4]: predecessor index, successor index, type 0 FS/1 SS/2 FF/3 SF, lag.
   output starts[n],finishes[n] at n+4*m. Durations/lags must use the same units.
   Negative starts clamped to zero. Returns -2 for cycle, -3 invalid edge. */
__attribute__((visibility("default"))) int forward_pass(int n,int m){
 if(n<1||m<0||7*n+5*m>CAP)return -1;
 double *edges=data+n,*es=edges+4*m,*ef=es+n,*degree=ef+n,*head=degree+n,*queue=head+n,*next=queue+n;
 for(int i=0;i<n;i++){es[i]=ef[i]=degree[i]=0;head[i]=-1;if(data[i]<0)return -3;}
 for(int j=0;j<m;j++){int p=(int)edges[j*4],s=(int)edges[j*4+1],t=(int)edges[j*4+2];if(p<0||p>=n||s<0||s>=n||t<0||t>3)return -3;degree[s]++;next[j]=head[p];head[p]=j;}
 int tail=0,front=0;for(int i=0;i<n;i++)if(degree[i]==0)queue[tail++]=i;
 while(front<tail){int p=(int)queue[front++];ef[p]=es[p]+data[p];for(int j=(int)head[p];j>=0;j=(int)next[j]){int s=(int)edges[4*j+1],t=(int)edges[4*j+2];double lag=edges[4*j+3],v=(t==1||t==3?es[p]:ef[p])+lag-(t>=2?data[s]:0);if(v>es[s])es[s]=v;if(--degree[s]==0)queue[tail++]=s;}}
 return front==n?0:-2;
}
