Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  root "application#root"
  resources :subscriptions, only: [:index, :create, :destroy]
  resources :messages, only: [:index, :show, :create, :update, :destroy] do
    resource :ack, only: [:update], module: :messages
  end
  post '/test' => 'tests#create'

  resource :current_user, only: [:show]
  resource :session, only: [:destroy]
  # https://github.com/omniauth/omniauth#rails-without-devise
  get 'auth/:provider/callback', to: 'sessions#create'
end
