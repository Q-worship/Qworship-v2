import { Route, Switch } from 'wouter'
import { ChatbotWidget } from '@/components/chat/ChatbotWidget'
import { Layout } from '@/components/layout/Layout'
import { Home } from '@/pages/Home'
import { Features } from '@/pages/Features'
import { About } from '@/pages/About'
import { Pricing } from '@/pages/Pricing'
import { Resources } from '@/pages/Resources'
import { Guides } from '@/pages/Guides'
import { FAQs } from '@/pages/FAQs'
import { Downloads } from '@/pages/Downloads'
import { JobDetailPage } from '@/pages/JobDetailPage'
import { Login } from '@/pages/Login'
import { SignUp } from '@/pages/SignUp'
import { Verify } from '@/pages/Verify'

export function App() {
  return (
    <>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={SignUp} />
        <Route path="/verify" component={Verify} />
        <Route>
          <Layout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/features" component={Features} />
              <Route path="/about/careers/:jobId" component={JobDetailPage} />
              <Route path="/about" component={About} />
              <Route path="/pricing" component={Pricing} />
              <Route path="/resources" component={Resources} />
              <Route path="/guides" component={Guides} />
              <Route path="/faqs" component={FAQs} />
              <Route path="/downloads" component={Downloads} />
            </Switch>
          </Layout>
        </Route>
      </Switch>
      <ChatbotWidget />
    </>
  )
}
