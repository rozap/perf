defmodule Perf.Router do
  use Perf.Web, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_flash
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
    plug Plug.Parsers, parsers: [:json], json_decoder: Poison
  end

  scope "/", Perf do
    pipe_through :browser # Use the default browser stack

    get "/*page", AppController, :index
  end

  scope "/api", Perf do
    pipe_through :api

    post "/user", Api.User, :index
    post "/session", Api.Session, :index
  end
end
