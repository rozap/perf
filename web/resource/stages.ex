defmodule Perf.Resource.Stages do
  import Perf.Resource
  alias Perf.Resource.State
  alias Perf.User
  
  def check_auth(_, %State{socket: socket, params: params} = state) do
    case socket.assigns do
      %{user: %User{} = user} ->
        params = Map.put(params, "user_id", user.id)
        struct(state, params: params)
      _ -> 
        forbidden(state)
    end
  end


end